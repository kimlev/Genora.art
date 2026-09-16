import { isSameOrigin, jsonError } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(await requestLocale()).invalidOrigin, 403);
  await clearSession();
  return Response.json({ ok: true });
}
