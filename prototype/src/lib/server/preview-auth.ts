import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

export const PREVIEW_COOKIE = "genora_preview";
const REMEMBER_SECONDS = 60 * 60 * 24 * 30;
const SESSION_SECONDS = 60 * 60 * 12;

function secret(): string {
  const value = process.env.PREVIEW_COOKIE_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("PREVIEW_AUTH_NOT_CONFIGURED");
  return value;
}

function signature(expires: string): string {
  return createHmac("sha256", secret()).update(`genora:${expires}`).digest("base64url");
}

export function createPreviewToken(durationSeconds: number): string {
  const expires = String(Math.floor(Date.now() / 1000) + durationSeconds);
  return `${expires}.${signature(expires)}`;
}

export function verifyPreviewToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(expires);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function previewCredentialsMatch(username: string, password: string): Promise<boolean> {
  const path = process.env.PREVIEW_HTPASSWD_PATH?.trim() || "/run/secrets/genora-preview.htpasswd";
  const line = (await readFile(/* turbopackIgnore: true */ path, "utf8")).split(/\r?\n/).find(Boolean);
  if (!line) return false;
  const separator = line.indexOf(":");
  if (separator < 1) return false;
  const expectedUsername = line.slice(0, separator);
  const passwordHash = line.slice(separator + 1).replace(/^\$2y\$/, "$2b$");
  return username === expectedUsername && compare(password, passwordHash);
}

export async function setPreviewCookie(remember: boolean): Promise<void> {
  const duration = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  (await cookies()).set(PREVIEW_COOKIE, createPreviewToken(duration), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", priority: "high",
    ...(process.env.PREVIEW_COOKIE_DOMAIN ? { domain: process.env.PREVIEW_COOKIE_DOMAIN } : {}),
    ...(remember ? { maxAge: duration } : {}),
  });
}
