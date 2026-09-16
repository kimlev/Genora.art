import "server-only";

import { query } from "@/lib/server/db";
import {
  ensureBrandMailbox,
  fetchAllInboxMessages,
  fetchNewInboxMessages,
  listInboxSenders,
  moveMessagesToFolder,
  restoreSenderFoldersToInbox,
  withImap,
  type InboxMessage,
} from "@/lib/server/imap-inbox";
import {
  listEnabledMailboxRows,
  mailboxImapAccount,
  saveMailboxSyncState,
  type SupportMailboxRow,
} from "@/lib/server/support-mailboxes";
import {
  brandFolderName,
  detectMessageLocale,
  isAutomatedMail,
  normalizeSenderEmail,
  shouldRunDailyOrganize,
} from "@/lib/support-policy";

type SenderFolder = { sender_email: string; folder_name: string; folder_path: string };

function asDateString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function knownFolders(): Promise<Map<string, SenderFolder>> {
  const rows = await query<SenderFolder>("SELECT sender_email,folder_name,folder_path FROM support_sender_folders");
  return new Map(rows.map((row) => [row.sender_email, row]));
}

async function rememberFolder(email: string, folderName: string, folderPath: string) {
  await query(`INSERT INTO support_sender_folders(sender_email,folder_name,folder_path)
    VALUES($1,$2,$3)
    ON CONFLICT (sender_email) DO UPDATE SET folder_name=excluded.folder_name,folder_path=excluded.folder_path`,
  [email, folderName, folderPath]);
}

async function createEmailTicket(message: InboxMessage, inboxEmail: string) {
  const from = normalizeSenderEmail(message.from);
  const locale = detectMessageLocale(`${message.subject}\n${message.text}`);
  const topic = "inbound-email";
  const preview = [message.subject, message.text].filter(Boolean).join("\n\n").slice(0, 4_000) || "(empty)";
  const body = (message.html || preview).slice(0, 800_000);
  const created = await query<{ id: string }>(`INSERT INTO support_requests(name,email,topic,message,channel,locale,source_message_id,skip_reply,next_agent_reply_at,inbox_email)
    VALUES($1,$2,$3,$4,'email',$5,$6,true,NULL,$7)
    ON CONFLICT (source_message_id) WHERE source_message_id IS NOT NULL DO NOTHING
    RETURNING id`, [from.split("@")[0] || "client", from, topic, preview, locale, message.messageId || null, inboxEmail]);
  const id = created[0]?.id;
  if (!id) return { created: false, skipped: false as const };
  await query(`INSERT INTO support_request_messages(support_request_id,direction,author_type,content)
    VALUES($1,'inbound','client',$2)`, [id, body]);
  return { created: true, skipped: false as const };
}

async function ingestMessages(messages: InboxMessage[], folders: Map<string, SenderFolder>, clientBrandFolders: Map<string, string>, inboxEmail: string) {
  const result = { ingested: 0, tickets: 0, skipped: 0, moved: 0 };
  const toMove = new Map<string, number[]>();
  for (const message of messages) {
    result.ingested += 1;
    const from = normalizeSenderEmail(message.from);
    if (!from) continue;
    const ticket = await createEmailTicket(message, inboxEmail);
    if (ticket.created) result.tickets += 1;
    else result.skipped += 1;
    const brand = brandFolderName(from) ?? (isAutomatedMail({ from, subject: message.subject, text: message.text, headers: message.headers }) ? "Automated" : null);
    if (!brand) continue;
    const remembered = folders.get(from);
    const folderPath = clientBrandFolders.get(brand)
      ?? (remembered?.folder_path.startsWith("INBOX/Brands/") ? remembered.folder_path : undefined);
    if (!folderPath) continue;
    const uids = toMove.get(folderPath) ?? [];
    uids.push(message.uid);
    toMove.set(folderPath, uids);
  }
  return { ...result, toMove };
}

type SyncResult = {
  skipped: false;
  mailbox: string;
  ingested: number;
  tickets: number;
  ignored: number;
  moved: number;
  organized: number;
  restored: number;
};

async function syncMailbox(mailbox: SupportMailboxRow, now: Date, full = false): Promise<SyncResult | { skipped: false; mailbox: string; error: string }> {
  const folders = await knownFolders();
  try {
    return await withImap(mailboxImapAccount(mailbox), async (client) => {
      const restored = await restoreSenderFoldersToInbox(client);
      const lastUid = full || restored > 0 ? 0 : Number(mailbox.last_uid) || 0;
      const fetched = full || lastUid < 1
        ? await fetchAllInboxMessages(client)
        : await fetchNewInboxMessages(client, lastUid, restored > 0 ? null : mailbox.uid_validity);
      const clientBrandFolders = new Map<string, string>();
      for (const message of fetched.messages) {
        const from = normalizeSenderEmail(message.from);
        const brand = brandFolderName(from) ?? (isAutomatedMail({ from, subject: message.subject, text: message.text, headers: message.headers }) ? "Automated" : null);
        if (!brand || clientBrandFolders.has(brand)) continue;
        const created = await ensureBrandMailbox(client, brand);
        await rememberFolder(`brand:${brand.toLowerCase()}`, created.folderName, created.folderPath);
        clientBrandFolders.set(brand, created.folderPath);
      }
      const ingested = await ingestMessages(fetched.messages, folders, clientBrandFolders, mailbox.email);
      for (const [folderPath, uids] of ingested.toMove) {
        await moveMessagesToFolder(client, uids, folderPath);
        ingested.moved += uids.length;
      }

      let organized = 0;
      if (shouldRunDailyOrganize(now, asDateString(mailbox.last_organized_on))) {
        const grouped = await listInboxSenders(client);
        for (const [email, uids] of grouped) {
          const brand = brandFolderName(email);
          if (!brand) continue;
          const created = await ensureBrandMailbox(client, brand);
          await rememberFolder(`brand:${brand.toLowerCase()}`, created.folderName, created.folderPath);
          await moveMessagesToFolder(client, uids, created.folderPath);
          organized += 1;
        }
        await saveMailboxSyncState(mailbox.id, {
          lastUid: fetched.lastUid,
          uidValidity: fetched.uidValidity,
          lastOrganizedOn: now.toISOString().slice(0, 10),
          lastError: null,
        });
      } else {
        await saveMailboxSyncState(mailbox.id, { lastUid: fetched.lastUid, uidValidity: fetched.uidValidity, lastError: null });
      }

      return {
        skipped: false as const,
        mailbox: mailbox.email,
        ingested: ingested.ingested,
        tickets: ingested.tickets,
        ignored: ingested.skipped,
        moved: ingested.moved,
        organized,
        restored,
      };
    });
  } catch (error) {
    const code = (error instanceof Error ? error.message : "unknown").slice(0, 180);
    await saveMailboxSyncState(mailbox.id, { lastError: code });
    console.error("support_inbox_sync_failed", mailbox.email, code);
    return { skipped: false as const, mailbox: mailbox.email, error: code };
  }
}

export async function syncSupportMailbox(id: string, options: { full?: boolean } = {}) {
  const mailboxes = await listEnabledMailboxRows();
  const mailbox = mailboxes.find((item) => item.id === id);
  if (!mailbox) return { skipped: true as const, reason: "MAILBOX_DISABLED" };
  return syncMailbox(mailbox, new Date(), Boolean(options.full));
}

export async function syncSupportInbox(now = new Date()) {
  const mailboxes = await listEnabledMailboxRows();
  if (!mailboxes.length) return { skipped: true as const, reason: "IMAP_NOT_CONFIGURED" };
  const results = [];
  for (const mailbox of mailboxes) results.push(await syncMailbox(mailbox, now));
  const failed = results.find((item) => "error" in item);
  if (results.length === 1) return results[0];
  return {
    skipped: false as const,
    mailboxes: results,
    ingested: results.reduce((sum, item) => sum + ("ingested" in item ? item.ingested : 0), 0),
    tickets: results.reduce((sum, item) => sum + ("tickets" in item ? item.tickets : 0), 0),
    error: failed && "error" in failed ? failed.error : undefined,
  };
}
