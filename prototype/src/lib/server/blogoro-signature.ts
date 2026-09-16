import { timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";

export function blogoroWebhookSecret(): string {
  return process.env.BLOGORO_WEBHOOK_SECRET?.trim() ?? "";
}

export function verifyBlogoroSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const provided = signatureHeader.trim();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
