import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/server/db";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

type StoredToken = {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | Date | null;
};

function oauthConfig() {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  const encryptionSecret = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim();
  const origin = process.env.ADMIN_PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim()
    || (origin ? `${origin}/api/admin/youtube/oauth/callback` : "");
  if (!clientId || !clientSecret || !encryptionSecret || !redirectUri) return null;
  return { clientId, clientSecret, encryptionSecret, redirectUri };
}

function encryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function encryptToken(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((item) => item.toString("base64url")).join(".");
}

function decryptToken(value: string, secret: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("YOUTUBE_TOKEN_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function youtubeConnectionRequirements() {
  const config = oauthConfig();
  return {
    oauthConfigured: Boolean(config),
    apiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
    integratorConfigured: Boolean(process.env.INTEGRATOR_BASE_URL?.trim() && process.env.INTEGRATOR_API_KEY?.trim()),
    workerConfigured: Boolean(process.env.SUPPORT_WORKER_SECRET?.trim()),
    redirectUri: config?.redirectUri ?? null,
    scopes: SCOPES,
    requiredEnvironment: [
      "YOUTUBE_API_KEY",
      "YOUTUBE_OAUTH_CLIENT_ID",
      "YOUTUBE_OAUTH_CLIENT_SECRET",
      "YOUTUBE_TOKEN_ENCRYPTION_KEY",
      "YOUTUBE_OAUTH_REDIRECT_URI (необязательно при ADMIN_PUBLIC_ORIGIN)",
      "INTEGRATOR_BASE_URL",
      "INTEGRATOR_API_KEY",
      "SUPPORT_WORKER_SECRET",
    ],
  };
}

export async function createYoutubeAuthorization(adminId: string): Promise<string> {
  const config = oauthConfig();
  if (!config) throw new Error("YOUTUBE_OAUTH_NOT_CONFIGURED");
  const state = randomBytes(32).toString("base64url");
  await query("DELETE FROM youtube_oauth_states WHERE expires_at<=now()");
  await query(
    `INSERT INTO youtube_oauth_states(token_hash,administrator_id,expires_at)
     VALUES($1,$2,now()+interval '10 minutes')`,
    [tokenHash(state), adminId],
  );
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const config = oauthConfig();
  if (!config) throw new Error("YOUTUBE_OAUTH_NOT_CONFIGURED");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null) as TokenResponse & { error?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error(payload?.error || "YOUTUBE_OAUTH_EXCHANGE_FAILED");
  return payload;
}

export async function finishYoutubeAuthorization(adminId: string, state: string, code: string) {
  const config = oauthConfig();
  if (!config) throw new Error("YOUTUBE_OAUTH_NOT_CONFIGURED");
  const states = await query<{ administrator_id: string }>(
    `DELETE FROM youtube_oauth_states
     WHERE token_hash=$1 AND administrator_id=$2 AND expires_at>now()
     RETURNING administrator_id`,
    [tokenHash(state), adminId],
  );
  if (!states.length) throw new Error("YOUTUBE_OAUTH_STATE_INVALID");
  const tokens = await exchangeCode(code);
  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in - 30) * 1000);
  await query(
    `UPDATE youtube_settings SET
       access_token_encrypted=$1,
       refresh_token_encrypted=COALESCE($2,refresh_token_encrypted),
       token_expires_at=$3,
       scopes=$4,
       updated_by=$5,
       updated_at=now()
     WHERE id='default'`,
    [
      encryptToken(tokens.access_token, config.encryptionSecret),
      tokens.refresh_token ? encryptToken(tokens.refresh_token, config.encryptionSecret) : null,
      expiresAt,
      (tokens.scope || SCOPES.join(" ")).split(/\s+/).filter(Boolean),
      adminId,
    ],
  );
  const channel = await youtubeApi<{ items?: Array<{ id: string; snippet?: { title?: string; customUrl?: string } }> }>(
    "/youtube/v3/channels?part=snippet&mine=true",
  );
  const item = channel.items?.[0];
  if (!item?.id) throw new Error("YOUTUBE_CHANNEL_NOT_FOUND");
  await query(
    `UPDATE youtube_settings SET channel_id=$1,channel_title=$2,channel_handle=$3,updated_at=now() WHERE id='default'`,
    [item.id, item.snippet?.title ?? null, item.snippet?.customUrl ?? null],
  );
  return { channelId: item.id, title: item.snippet?.title ?? null, handle: item.snippet?.customUrl ?? null };
}

export async function disconnectYoutube(adminId: string) {
  await query(
    `UPDATE youtube_settings SET channel_id=null,channel_title=null,channel_handle=null,
      access_token_encrypted=null,refresh_token_encrypted=null,token_expires_at=null,scopes='{}',
      updated_by=$1,updated_at=now() WHERE id='default'`,
    [adminId],
  );
}

async function currentAccessToken(): Promise<string> {
  const config = oauthConfig();
  if (!config) throw new Error("YOUTUBE_OAUTH_NOT_CONFIGURED");
  const rows = await query<StoredToken>(
    "SELECT access_token_encrypted,refresh_token_encrypted,token_expires_at FROM youtube_settings WHERE id='default'",
  );
  const row = rows[0];
  if (!row?.access_token_encrypted) throw new Error("YOUTUBE_NOT_CONNECTED");
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 120_000) return decryptToken(row.access_token_encrypted, config.encryptionSecret);
  if (!row.refresh_token_encrypted) throw new Error("YOUTUBE_RECONNECT_REQUIRED");
  const refreshToken = decryptToken(row.refresh_token_encrypted, config.encryptionSecret);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null) as TokenResponse & { error?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error(payload?.error || "YOUTUBE_TOKEN_REFRESH_FAILED");
  await query(
    `UPDATE youtube_settings SET access_token_encrypted=$1,token_expires_at=$2,updated_at=now() WHERE id='default'`,
    [
      encryptToken(payload.access_token, config.encryptionSecret),
      new Date(Date.now() + Math.max(60, payload.expires_in - 30) * 1000),
    ],
  );
  return payload.access_token;
}

export async function youtubeApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await currentAccessToken();
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(60_000),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null) as T & { error?: { message?: string } } | null;
  if (!response.ok || !payload) throw new Error(payload?.error?.message || `YOUTUBE_HTTP_${response.status}`);
  return payload;
}

export async function uploadYoutubeVideo(input: {
  bytes: Buffer;
  mime: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: "private" | "unlisted" | "public";
  scheduledAt: string | null;
}) {
  const token = await currentAccessToken();
  const future = input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now() + 60_000;
  const body = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5_000),
      tags: input.tags.slice(0, 500),
      categoryId: input.categoryId,
    },
    status: {
      privacyStatus: future ? "private" : input.privacyStatus,
      selfDeclaredMadeForKids: false,
      ...(future ? { publishAt: new Date(input.scheduledAt as string).toISOString() } : {}),
    },
  };
  const begin = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(input.bytes.byteLength),
      "x-upload-content-type": input.mime,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!begin.ok) throw new Error(`YOUTUBE_UPLOAD_INIT_${begin.status}`);
  const location = begin.headers.get("location");
  if (!location) throw new Error("YOUTUBE_UPLOAD_LOCATION_MISSING");
  const uploaded = await fetch(location, {
    method: "PUT",
    headers: { "content-type": input.mime, "content-length": String(input.bytes.byteLength) },
    body: new Uint8Array(input.bytes),
    cache: "no-store",
    signal: AbortSignal.timeout(30 * 60_000),
  });
  const result = await uploaded.json().catch(() => null) as { id?: string; error?: { message?: string } } | null;
  if (!uploaded.ok || !result?.id) throw new Error(result?.error?.message || `YOUTUBE_UPLOAD_${uploaded.status}`);
  return { videoId: result.id, url: `https://www.youtube.com/watch?v=${result.id}`, scheduled: Boolean(future) };
}
