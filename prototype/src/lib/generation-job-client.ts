import type { PublicErrorCode } from "@/lib/public-error";

export type PublicGenerationJob = {
  id: string;
  kind: "chat" | "image" | "video" | "music";
  surface: "chat" | "images" | "audio";
  conversationId: string | null;
  status: "creating" | "ready" | "failed";
  title?: string | null;
  modelLabel?: string | null;
  createdAt: string;
  errorCode?: PublicErrorCode | null;
  error?: string | null;
  result?: Record<string, unknown>;
};

export class GenerationJobError extends Error {
  constructor(message: string, readonly errorCode?: PublicErrorCode | null) {
    super(message);
    this.name = "GenerationJobError";
  }
}

export function isPageDisconnect(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch|Load failed|network|aborted|The user aborted/i.test(message);
}

export async function waitForGenerationJob(jobId: string, maxMs = 50 * 60_000): Promise<PublicGenerationJob> {
  const deadline = Date.now() + maxMs;
  let waited = false;
  while (Date.now() < deadline) {
    if (waited) await new Promise((resolve) => window.setTimeout(resolve, 2000));
    waited = true;
    let response: Response;
    try {
      response = await fetch(`/api/generation-jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    } catch {
      continue;
    }
    const data = await response.json().catch(() => null) as { job?: PublicGenerationJob; error?: string } | null;
    if (data?.job?.kind !== "chat" && (data?.job?.status === "ready" || data?.job?.status === "failed")) {
      window.dispatchEvent(new Event("genora-balance-changed"));
    }
    if (data?.job?.status === "ready") return data.job;
    if (data?.job?.status === "failed") throw new GenerationJobError(data.job.error || data.error || "failed", data.job.errorCode);
  }
  throw new Error("generation_timeout");
}
