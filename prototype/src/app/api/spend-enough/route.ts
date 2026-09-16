import { jsonError } from "@/lib/server/http";
import { ensureSpendEnoughToday } from "@/lib/server/spend-enough";
import { IS_STAGING } from "@/lib/site-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!IS_STAGING) return jsonError("Not found", 404);
  try {
    const snapshot = await ensureSpendEnoughToday();
    if (!snapshot) return jsonError("Not found", 404);
    return Response.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("spend_enough_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось загрузить оценку", 500);
  }
}
