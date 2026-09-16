import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { adminCookieName, cookiePath } from "@/lib/site-env";
import { query } from "./db";
import { requestMeta } from "./request-meta";

function adminCookie() {
  return adminCookieName();
}
const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
const REMEMBERED_ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 30;

export type AdminUser = { id: string; email: string; name: string | null };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secureCookie(): boolean {
  const configured = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function createAdminSession(administratorId: string, request: Request, remember = false): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const meta = requestMeta(request);
  const duration = remember ? REMEMBERED_ADMIN_SESSION_SECONDS : ADMIN_SESSION_SECONDS;
  await query(`INSERT INTO admin_sessions(token_hash, administrator_id, ip_address, country_code, user_agent, expires_at)
    VALUES($1,$2,$3,$4,$5,$6)`, [hashToken(token), administratorId, meta.ipAddress, meta.countryCode, meta.userAgent,
      new Date(Date.now() + duration * 1000)]);
  (await cookies()).set(adminCookie(), token, {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookie(),
    path: cookiePath(),
    ...(remember ? { maxAge: duration } : {}),
    priority: "high",
  });
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(adminCookie())?.value;
  if (!token) return null;
  const rows = await query<AdminUser>(`SELECT a.id,a.email,a.name FROM admin_sessions s
    JOIN administrators a ON a.id=s.administrator_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND a.active=true`, [hashToken(token)]);
  return rows[0] ?? null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("ADMIN_UNAUTHORIZED");
  return admin;
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  const name = adminCookie();
  const token = store.get(name)?.value;
  if (token) await query("DELETE FROM admin_sessions WHERE token_hash=$1", [hashToken(token)]);
  store.delete({ name, path: cookiePath() });
}

export async function auditAdmin(request: Request, adminId: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}): Promise<void> {
  const meta = requestMeta(request);
  await query(`INSERT INTO admin_audit_log(administrator_id,action,entity_type,entity_id,metadata,ip_address)
    VALUES($1,$2,$3,$4,$5,$6)`, [adminId, action, entityType, entityId ?? null, metadata, meta.ipAddress]);
}
