import "server-only";

import { settleChatJob } from "@/lib/server/chat-jobs";
import { type GenerationJobRow } from "@/lib/server/generation-jobs";
import { settleImageJob } from "@/lib/server/image-jobs";
import { settleMusicJob } from "@/lib/server/music-jobs";

export async function settleGenerationJob(job: GenerationJobRow): Promise<void> {
  if (job.status !== "creating") return;
  if (job.kind === "chat") await settleChatJob(job);
  if (job.kind === "image") await settleImageJob(job);
  if (job.kind === "music") await settleMusicJob(job);
}
