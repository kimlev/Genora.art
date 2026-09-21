import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: unknown, remoteIp: string | null | undefined, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (process.env.NEXT_PUBLIC_STAGING === "1" && !secret) return true;
  if (!secret) return process.env.NODE_ENV !== "production";
  const responseToken = typeof token === "string" ? token.trim() : "";
  if (!responseToken || responseToken.length > 2_048) return false;

  const body = new URLSearchParams({ secret, response: responseToken });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return false;
  const result = await response.json().catch(() => null) as { success?: boolean; action?: string; hostname?: string } | null;
  if (!result?.success || result.action !== action) return false;
  const expectedHostname = process.env.TURNSTILE_ALLOWED_HOSTNAME?.trim();
  return !expectedHostname || result.hostname === expectedHostname;
}
