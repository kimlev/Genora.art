import "server-only";

import { query } from "@/lib/server/db";
import { type GenerationJobRow } from "@/lib/server/generation-jobs";
import { settleGenerationJob } from "@/lib/server/generation-settle";
import { integratorListRequests } from "@/lib/server/integrator";

export async function reconcileOpenGenerationJobs(): Promise<void> {
  const holds = await integratorListRequests().catch(() => []);
  if (!holds.length) return;
  const ids = holds.map((item) => item.request_id).filter(Boolean);
  if (!ids.length) return;
  const jobs = await query<GenerationJobRow>(
    `SELECT id,user_id,kind,surface,conversation_id,status,title,model_label,payload,result,error,acked_at,created_at,updated_at
       FROM generation_jobs WHERE id = ANY($1::uuid[]) AND status='creating'`,
    [ids],
  );
  for (const job of jobs) {
    try {
      await settleGenerationJob(job);
    } catch (error) {
      console.error("generation_reconcile_failed", job.id, error instanceof Error ? error.message : "unknown");
    }
  }
}
