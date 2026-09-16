import { cookies } from "next/headers";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_TTL_SECONDS,
  buildAuthorizationRequest,
  googleOAuthConfig,
  loginErrorUrl,
  publicBaseUrl,
} from "@/lib/server/google-oauth";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/chat";
  return value.slice(0, 200);
}

export async function GET(request: Request) {
  let config;
  try {
    config = googleOAuthConfig();
  } catch {
    return Response.redirect(loginErrorUrl("google_unavailable"), 302);
  }

  const meta = requestMeta(request);
  const allowed = await consumeRateLimit({
    scope: "google_oauth_start",
    identifier: meta.ipAddress ?? "unknown",
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!allowed) return Response.redirect(loginErrorUrl("rate_limited"), 302);

  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("next"));
  const { authorizationUrl, state, codeVerifier } = buildAuthorizationRequest(config);

  const store = await cookies();
  store.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, codeVerifier, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(publicBaseUrl()).protocol === "https:",
    path: "/api/auth/google",
    maxAge: GOOGLE_STATE_TTL_SECONDS,
  });

  return Response.redirect(authorizationUrl, 302);
}
