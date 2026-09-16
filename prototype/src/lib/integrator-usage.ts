export type IntegratorUsageItem = {
  requestId: string;
  status: string;
  source?: string;
  costUsd: number;
  latencyMs: number;
  model?: string;
  provider?: string;
};

export function normalizeIntegratorUsageItem(raw: unknown): IntegratorUsageItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const requestId = String(row.requestId ?? row.request_id ?? "").trim();
  if (!requestId) return null;
  const costUsd = Number(row.costUsd ?? row.cost_usd ?? 0);
  const latencyMs = Number(row.latencyMs ?? row.latency_ms ?? 0);
  return {
    requestId,
    status: String(row.status ?? ""),
    source: typeof row.source === "string" ? row.source : undefined,
    costUsd: Number.isFinite(costUsd) ? costUsd : 0,
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
    model: typeof row.model === "string" ? row.model : undefined,
    provider: typeof row.provider === "string" ? row.provider : undefined,
  };
}

export function isAbortOrTimeout(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return name === "TimeoutError" || name === "AbortError" || /timeout|aborted|AbortError/i.test(message);
}

export function isPipeBreak(error: unknown): boolean {
  if (isAbortOrTimeout(error)) return true;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return name === "TypeError" || /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|UND_ERR|network/i.test(message);
}
