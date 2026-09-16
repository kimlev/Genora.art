import "server-only";

import { query, withTransaction } from "@/lib/server/db";
import { sendSupportReply } from "@/lib/server/mail";
import { generateSupportAgentReply } from "@/lib/server/support-agent";
import { getMailCopy } from "@/lib/mail-copy";
import { mailboxEmails } from "@/lib/server/support-mailboxes";
import { isCorporateSender, normalizeSenderEmail, senderDomain } from "@/lib/support-policy";
import { supportEscalationReason } from "@/lib/support-routing";

type DueSupport = {
  id: string;
  public_id: string;
  email: string;
  topic: string;
  message: string;
  draft_reply: string | null;
  locale: string | null;
  channel: string | null;
  skip_reply: boolean;
};

type HistoryRow = { direction: "inbound" | "outbound"; content: string };
type SupportAdmin = { id: string; email: string; name: string | null };

async function corporateAllowlist() {
  const admins = await query<{ email: string }>("SELECT email FROM administrators WHERE active=true");
  const extraEmails = [
    ...admins.map((row) => row.email),
    process.env.SMTP_USER,
    process.env.SMTP_FROM_EMAIL,
    process.env.SMTP_REPLY_TO,
    process.env.IMAP_USER,
    ...(await mailboxEmails()),
  ].filter((value): value is string => Boolean(value));
  const extraDomains = extraEmails.map((email) => senderDomain(normalizeSenderEmail(email))).filter(Boolean);
  return { extraEmails, extraDomains };
}

async function claimDueSupport(): Promise<DueSupport | null> {
  return withTransaction(async (client) => {
    const result = await client.query<DueSupport>(`SELECT id,public_id,email,topic,message,draft_reply,locale,channel,skip_reply
      FROM support_requests
      WHERE status='new' AND replied_at IS NULL AND next_agent_reply_at<=now()
        AND COALESCE(skip_reply,false)=false
        AND COALESCE(channel,'web_form')='web_form'
        AND (agent_locked_at IS NULL OR agent_locked_at<now()-interval '5 minutes')
        AND agent_reply_attempts<3
      ORDER BY CASE WHEN COALESCE(channel,'web_form')='web_form' THEN 0 ELSE 1 END, next_agent_reply_at, created_at
      FOR UPDATE SKIP LOCKED LIMIT 1`);
    const support = result.rows[0];
    if (!support) return null;
    await client.query(`UPDATE support_requests SET agent_locked_at=now(),agent_reply_attempts=agent_reply_attempts+1,last_agent_error=NULL
      WHERE id=$1`, [support.id]);
    return support;
  });
}

async function failSupport(id: string, error: unknown) {
  const code = (error instanceof Error ? error.message : "unknown").slice(0, 180);
  await query(`UPDATE support_requests SET agent_locked_at=NULL,last_agent_error=$2,
    next_agent_reply_at=CASE WHEN agent_reply_attempts>=3 THEN NULL ELSE now()+interval '5 minutes' END,
    status=CASE WHEN agent_reply_attempts>=3 THEN 'requires_human' ELSE status END,
    requires_human=CASE WHEN agent_reply_attempts>=3 THEN true ELSE requires_human END
    WHERE id=$1`, [id, code]);
  console.error("support_worker_failed", id, code);
}

async function skipSupport(id: string, reason: string) {
  await query(`UPDATE support_requests SET skip_reply=true,next_agent_reply_at=NULL,agent_locked_at=NULL,last_agent_error=$2
    WHERE id=$1`, [id, reason]);
}

async function processSupport(support: DueSupport) {
  const { extraEmails, extraDomains } = await corporateAllowlist();
  if (support.channel !== "web_form" && support.channel) {
    await skipSupport(support.id, "SKIPPED_NOT_WEB_FORM");
    return;
  }
  if (support.skip_reply || isCorporateSender(support.email, extraEmails, extraDomains)) {
    await skipSupport(support.id, "SKIPPED_CORPORATE_SENDER");
    return;
  }

  const admin = (await query<SupportAdmin>(
    "SELECT id,email,name FROM administrators WHERE active=true ORDER BY created_at LIMIT 1",
  ))[0];
  if (!admin) throw new Error("SUPPORT_ADMIN_NOT_CONFIGURED");

  const escalationReason = supportEscalationReason(support.topic, support.message);
  const copy = getMailCopy(support.locale);
  let reply = support.draft_reply;
  if (!reply) {
    const history = await query<HistoryRow>(`SELECT direction,content FROM support_request_messages
      WHERE support_request_id=$1 ORDER BY created_at,id`, [support.id]);
    const generated = await generateSupportAgentReply({
      support: { id: support.id, email: support.email, locale: support.locale },
      history,
      admin,
      escalationReason,
    });
    reply = generated.reply;
    await query("UPDATE support_requests SET draft_reply=$2 WHERE id=$1", [support.id, reply]);
  }

  await sendSupportReply(support.email, copy.supportReplySubject(support.public_id), reply, support.locale);
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO support_request_messages(support_request_id,direction,author_type,content)
      VALUES($1,'outbound','agent',$2)`, [support.id, reply]);
    await client.query(`UPDATE support_requests SET sent_reply=$2,draft_reply=NULL,
      status=$3,replied_at=now(),replied_by=$4,requires_human=$5,
      next_agent_reply_at=NULL,agent_locked_at=NULL,last_agent_error=NULL WHERE id=$1`,
    [support.id, reply, escalationReason ? "requires_human" : "in_progress", admin.id, Boolean(escalationReason)]);
  });
}

export async function processDueSupportRequests(limit = 5) {
  await query(`UPDATE support_requests
    SET skip_reply=true, next_agent_reply_at=NULL, agent_locked_at=NULL, last_agent_error='SKIPPED_NOT_WEB_FORM'
    WHERE COALESCE(channel,'web_form')<>'web_form' AND replied_at IS NULL AND skip_reply=false`);
  const result = { processed: 0, failed: 0 };
  for (let index = 0; index < Math.max(1, Math.min(limit, 10)); index += 1) {
    const support = await claimDueSupport();
    if (!support) break;
    try {
      await processSupport(support);
      result.processed += 1;
    } catch (error) {
      await failSupport(support.id, error);
      result.failed += 1;
    }
  }
  return result;
}
