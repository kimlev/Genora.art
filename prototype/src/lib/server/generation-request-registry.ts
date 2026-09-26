import "server-only";

import { randomUUID } from "node:crypto";
import { query } from "@/lib/server/db";

export type TrackedGenerationKind = "chat" | "image" | "video" | "music";

export async function registerGenerationRequest(userId: string, kind: TrackedGenerationKind): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO generation_request_registry(id,user_id,kind,status)
     VALUES($1,$2,$3,'running')`,
    [id, userId, kind],
  );
  return id;
}

export async function updateGenerationRequestMetadata(requestId: string, input: {
  provider?: string | null;
  modelId?: string | null;
  modelLabel?: string | null;
  agent?: string | null;
}): Promise<void> {
  await query(
    `UPDATE generation_request_registry
        SET provider=COALESCE($2,provider), model_id=COALESCE($3,model_id),
            model_label=COALESCE($4,model_label), agent=COALESCE($5,agent), updated_at=now()
      WHERE id=$1 AND status='running'`,
    [requestId, input.provider ?? null, input.modelId ?? null, input.modelLabel ?? null, input.agent ?? null],
  );
}

export async function failGenerationRequest(requestId: string, error: string): Promise<void> {
  await query(
    `UPDATE generation_request_registry
        SET status='error', error=$2, response_at=now(), updated_at=now()
      WHERE id=$1 AND status='running'`,
    [requestId, error.slice(0, 500)],
  );
}
