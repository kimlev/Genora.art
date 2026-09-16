import { SITE_ORIGIN } from "@/lib/site-env";
import { jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { creditDueWelcomeBonusForUser, dismissWelcomeBonusTeaser, ensureWelcomeBonusCampaign, getWelcomeBonusProgress, syncWelcomeBonusActivity } from "@/lib/server/welcome-bonus";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";

export const runtime = "nodejs";

export async function GET() {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    await ensureWelcomeBonusCampaign(user.id);
    await syncWelcomeBonusActivity(user.id);
    await creditDueWelcomeBonusForUser(user.id, "Приветственный бонус");
    const progress = await getWelcomeBonusProgress(user.id, SITE_ORIGIN, { sync: false });
    return Response.json({ progress });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.agentsLoadFailed, 500);
  }
}

export async function POST(request: Request) {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { action?: string } | null;
    if (body?.action === "dismiss") await dismissWelcomeBonusTeaser(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.agentsLoadFailed, 500);
  }
}
