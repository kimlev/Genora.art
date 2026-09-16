import "server-only";
import { query } from "@/lib/server/db";
import { markGenerationJobFailed, type GenerationJobRow } from "@/lib/server/generation-jobs";
import { settleGenerationJob } from "@/lib/server/generation-settle";
import { reconcileVideoJob, markVideoJobFailed } from "@/lib/server/video-jobs";

let running = false;
let timer: ReturnType<typeof setInterval> | undefined;

export async function reconcileMediaReservations() {
  if (running) return;
  running = true;
  try {
    const abandoned = await query<{ job_id: string; video: boolean }>(
      `SELECT r.job_id,(v.id IS NOT NULL) AS video FROM generation_reservations r
       LEFT JOIN video_jobs v ON v.id=r.job_id
       WHERE r.status='held' AND r.dispatched_at IS NULL AND r.created_at < now() - interval '5 minutes'`);
    for (const job of abandoned) {
      if (job.video) await markVideoJobFailed(job.job_id, "GENERATION_NOT_STARTED", true);
      else await markGenerationJobFailed(job.job_id, "GENERATION_NOT_STARTED", true);
    }
    const jobs = await query<GenerationJobRow>(
      "SELECT j.* FROM generation_jobs j JOIN generation_reservations r ON r.job_id=j.id WHERE j.status='creating' AND j.kind IN ('image','music') ORDER BY j.created_at");
    const videos = await query<{ id: string; user_id: string }>(
      "SELECT j.id,j.user_id FROM video_jobs j JOIN generation_reservations r ON r.job_id=j.id WHERE j.status='creating' ORDER BY j.created_at");
    for (const job of jobs) await settleGenerationJob(job).catch(() => undefined);
    for (const job of videos) await reconcileVideoJob(job.id, job.user_id).catch(() => undefined);
  } finally { running = false; }
}

export function startReservationReconciler() {
  if (timer) return;
  const run = () => { void reconcileMediaReservations().catch((error) => console.error("reservation_reconcile_failed", error instanceof Error ? error.message : "unknown")); };
  timer = setInterval(run, 30_000);
  timer.unref();
  run();
}
