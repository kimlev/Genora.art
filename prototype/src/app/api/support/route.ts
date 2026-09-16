import { withTransaction, query } from "@/lib/server/db";
import { isSameOrigin } from "@/lib/server/http";
import { sendSupportReceipt } from "@/lib/server/mail";
import { getPrimarySupportEmail } from "@/lib/server/support-mailboxes";
import { currentUser } from "@/lib/server/session";
import { isLocale } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { isCorporateSender } from "@/lib/support-policy";
import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RATE_LIMIT_MS = 5 * 60 * 1000;
/** Ключи тем формы; подписи на языке пользователя берутся из mail-copy при отправке письма */
const SUPPORT_TOPICS = new Set(["cooperation", "billing-refund", "other"]);

type SupportRequest = { name?: unknown; email?: unknown; topic?: unknown; message?: unknown; website?: unknown; turnstileToken?: unknown; locale?: unknown };

declare global {
  var genoraSupportRateLimits: Map<string, number> | undefined;
}

const rateLimits = globalThis.genoraSupportRateLimits ?? new Map<string, number>();
globalThis.genoraSupportRateLimits = rateLimits;

function getClientIp(request: Request): string {
  const direct = request.headers.get("x-real-ip")?.trim();
  if (direct) return direct;
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const addresses = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
  return addresses.at(-1) ?? "unknown";
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  const body = await request.json().catch(() => null) as SupportRequest | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const ip = getClientIp(request);
  const now = Date.now();
  for (const [key, timestamp] of rateLimits) if (now - timestamp >= RATE_LIMIT_MS) rateLimits.delete(key);
  const previousRequest = rateLimits.get(ip);
  if (previousRequest && now - previousRequest < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - previousRequest)) / 1000);
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  if (clean(body.website, 200)) {
    rateLimits.set(ip, now);
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (!await verifyTurnstile(body.turnstileToken, ip, "support")) {
    return NextResponse.json({ ok: false, error: "turnstile_failed" }, { status: 403 });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const topic = clean(body.topic, 40);
  const message = clean(body.message, 4_000);
  const locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : await requestLocale();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !SUPPORT_TOPICS.has(topic) || message.length < 10) {
    return NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 });
  }

  const skipReply = isCorporateSender(email);

  try {
    const user = await currentUser();
    const inboxEmail = await getPrimarySupportEmail();
    const support = await withTransaction(async (client) => {
      const created = await client.query<{ id: string; public_id: string }>(`INSERT INTO support_requests(user_id,name,email,topic,message,channel,locale,skip_reply,inbox_email)
        VALUES($1,$2,$3,$4,$5,'web_form',$6,$7,$8) RETURNING id,public_id`,
      [user?.id ?? null, name, email, topic, message, locale, skipReply, inboxEmail]);
      const row = created.rows[0];
      await client.query(`INSERT INTO support_request_messages(support_request_id,direction,author_type,content)
        VALUES($1,'inbound','client',$2)`, [row.id, message]);
      return row;
    });
    rateLimits.set(ip, now);

    let emailSent = false;
    if (!skipReply) {
      try {
        await sendSupportReceipt({ email, publicId: support.public_id, topic, message, locale });
        await query("UPDATE support_requests SET acknowledged_at=now(),next_agent_reply_at=now()+interval '10 minutes' WHERE id=$1", [support.id]);
        emailSent = true;
      } catch (error) {
        console.error("support_receipt_failed", error instanceof Error ? error.message : "unknown");
      }
    }

    return NextResponse.json({ ok: true, id: support.public_id, emailSent, replyScheduled: emailSent }, { status: 201 });
  } catch (error) {
    console.error("support_storage_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}
