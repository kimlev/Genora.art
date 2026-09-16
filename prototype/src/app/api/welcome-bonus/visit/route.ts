import { isSameOrigin, jsonError } from "@/lib/server/http";
import { rememberReferralVisit } from "@/lib/server/welcome-bonus";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("invalid", 403);
  const body = await request.json().catch(() => null) as { code?: unknown; visitorKey?: unknown } | null;
  const code = String(body?.code ?? "").trim().slice(0, 40);
  const visitorKey = String(body?.visitorKey ?? "").trim().slice(0, 80);
  if (!code || !visitorKey) return Response.json({ ok: true });
  await rememberReferralVisit(code, visitorKey).catch(() => undefined);
  return Response.json({ ok: true });
}
