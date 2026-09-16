import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_STATE_COOKIE = "genora_google_oauth";
export const GOOGLE_STATE_TTL_SECONDS = 10 * 60;

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function publicBaseUrl(): string {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("APP_BASE_URL_MUST_USE_HTTPS");
  return url.origin;
}

export function loginErrorUrl(reason: string): string {
  return `${publicBaseUrl()}/login?error=${reason}`;
}

export function googleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  return { clientId, clientSecret, redirectUri: `${publicBaseUrl()}/api/auth/google/callback` };
}

export type GoogleAuthorizationRequest = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
};

export function buildAuthorizationRequest(config: GoogleOAuthConfig): GoogleAuthorizationRequest {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return { authorizationUrl: url.toString(), state, codeVerifier };
}

export function statesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function exchangeCodeForIdentity(
  config: GoogleOAuthConfig,
  code: string,
  codeVerifier: string,
): Promise<GoogleIdentity> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
  const payload = await response.json() as { id_token?: unknown };
  const idToken = typeof payload.id_token === "string" ? payload.id_token : null;
  if (!idToken) throw new Error("GOOGLE_ID_TOKEN_MISSING");
  return parseIdToken(idToken, config.clientId);
}

// The token endpoint is called server-to-server over TLS, so the id_token signature is already
// covered by the channel (OpenID Connect Core 3.1.3.7); only the claims still need checking.
export function parseIdToken(idToken: string, clientId: string): GoogleIdentity {
  const segments = idToken.split(".");
  if (segments.length !== 3) throw new Error("GOOGLE_ID_TOKEN_MALFORMED");
  const claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as Record<string, unknown>;

  const audience = claims.aud;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(clientId)) throw new Error("GOOGLE_ID_TOKEN_AUDIENCE_MISMATCH");
  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) throw new Error("GOOGLE_ID_TOKEN_ISSUER_MISMATCH");
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) throw new Error("GOOGLE_ID_TOKEN_EXPIRED");

  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!sub || !email) throw new Error("GOOGLE_ID_TOKEN_INCOMPLETE");

  return {
    sub,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: typeof claims.name === "string" ? claims.name.trim().slice(0, 100) || null : null,
  };
}
