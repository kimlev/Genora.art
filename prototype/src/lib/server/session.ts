import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cookiePath, IS_STAGING, sessionCookieName } from "@/lib/site-env";
import { msUntilNextUtcMidnight, utcDateString } from "@/lib/welcome-bonus";
import { query } from "./db";
import { requestMeta } from "./request-meta";

function sessionCookie() {
  return sessionCookieName();
}
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SHORT_SESSION_SECONDS = 60 * 60 * 12;

function shouldUseSecureCookie(): boolean {
  const configured = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatarDataUrl?: string;
  timezone?: string;
  aiTone?: string;
  aiPreferences?: string;
  registrationCountry?: string;
  addressLine?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  detectedCountryCode?: string;
  detectedIpAddress?: string;
  balanceTokens: number;
  paidBalanceTokens: number;
  balanceScaleVersion: 3;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  avatar_data_url: string | null;
  timezone: string | null;
  ai_tone: string | null;
  ai_preferences: string | null;
  registration_country?: string | null;
  address_line?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  detected_country_code?: string | null;
  detected_ip_address?: string | null;
  balance_tokens: string;
  paid_balance_tokens?: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    nickname: row.nickname ?? undefined,
    avatarDataUrl: row.avatar_data_url ?? undefined,
    timezone: row.timezone ?? undefined,
    aiTone: row.ai_tone ?? undefined,
    aiPreferences: row.ai_preferences ?? undefined,
    registrationCountry: row.registration_country ?? undefined,
    addressLine: row.address_line ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    postalCode: row.postal_code ?? undefined,
    detectedCountryCode: row.detected_country_code ?? undefined,
    detectedIpAddress: row.detected_ip_address ?? undefined,
    balanceTokens: Number(row.balance_tokens),
    paidBalanceTokens: Number(row.paid_balance_tokens ?? 0),
    balanceScaleVersion: 3,
  };
}

export async function createSession(userId: string, request?: Request, remember = true): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const duration = IS_STAGING
    ? Math.max(60, Math.floor(msUntilNextUtcMidnight() / 1000))
    : remember ? SESSION_SECONDS : SHORT_SESSION_SECONDS;
  const expires = new Date(Date.now() + duration * 1000);
  const meta = request ? requestMeta(request) : { ipAddress: null, countryCode: null, userAgent: null };
  await query(`INSERT INTO sessions(token_hash, user_id, expires_at, ip_address, country_code, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6)`, [hashToken(token), userId, expires, meta.ipAddress, meta.countryCode, meta.userAgent]);
  const store = await cookies();
  store.set(sessionCookie(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: cookiePath(),
    ...(remember ? { maxAge: duration } : {}),
    priority: "high",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const name = sessionCookie();
  const token = store.get(name)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  store.delete({ name, path: cookiePath() });
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(sessionCookie())?.value;
  if (!token) return null;
  const rows = await query<UserRow & { session_created_at: Date }>(`SELECT u.id, u.email, u.name, u.nickname, u.avatar_data_url, u.timezone,
      u.ai_tone, u.ai_preferences, u.registration_country, u.address_line, u.city, u.region, u.postal_code,
      s.country_code AS detected_country_code, host(s.ip_address) AS detected_ip_address, u.balance_tokens, u.paid_balance_tokens,
      s.created_at AS session_created_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now()
      AND u.status <> 'blocked' AND u.email_verified_at IS NOT NULL`, [hashToken(token)]);
  const row = rows[0];
  if (!row) return null;
  if (IS_STAGING && utcDateString(row.session_created_at) !== utcDateString()) {
    await clearSession();
    return null;
  }
  return toUser(row);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function sessionUserFromRow(row: UserRow): SessionUser {
  return toUser(row);
}
