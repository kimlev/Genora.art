import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { query } from "@/lib/server/db";
import { after } from "next/server";
import { listCreatingVideoJobs, listVisibleVideoJobs, publicVideoJob, reconcileVideoJob } from "@/lib/server/video-jobs";

export const runtime = "nodejs";

export async function GET() {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const creating = await listCreatingVideoJobs(user.id);
    // The gallery must not wait for a slow upstream request to show local results.
    after(async () => { await Promise.all(creating.map((job) => reconcileVideoJob(job.id, user.id).catch(() => false))); });
    const jobs = await listVisibleVideoJobs(user.id);
    const settled = await query<{ id: string }>(
      "SELECT id FROM video_jobs WHERE user_id=$1 AND status='ready' ORDER BY updated_at DESC LIMIT 100",
      [user.id],
    );
    return Response.json({ jobs: jobs.map(publicVideoJob), settledJobIds: settled.map((job) => job.id) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}
