import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cookiePath, IS_STAGING } from "@/lib/site-env";
import { appSecret } from "./app-secret";

const COOKIE_NAME = IS_STAGING ? "genora_dev_pin_pending" : "genora_pin_pending";
const TTL_SECONDS = 10 * 60;

function shouldUseSecureCookie(): boolean {
  const configured = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

function sign(body: string): string {
  return createHmac("sha256", appSecret()).update(body).digest("base64url");
}

function cookieOptions(maxAge = TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookie(),
    path: cookiePath(),
    maxAge,
  };
}

export async function setPendingPinChallenge(userId: string): Promise<void> {
  const body = Buffer.from(JSON.stringify({ userId, exp: Date.now() + TTL_SECONDS * 1000 })).toString("base64url");
  const store = await cookies();
  store.set(COOKIE_NAME, `${body}.${sign(body)}`, cookieOptions());
}

export async function readPendingPinChallenge(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator < 1) return null;
  const body = raw.slice(0, separator);
  const mac = raw.slice(separator + 1);
  const expected = sign(body);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { userId?: unknown; exp?: unknown };
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function clearPendingPinChallenge(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", cookieOptions(0));
}

export async function hasPendingPinChallenge(): Promise<boolean> {
  return Boolean(await readPendingPinChallenge());
}
