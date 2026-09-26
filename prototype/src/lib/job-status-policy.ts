export const STALE_REQUEST_AFTER_MS = 12 * 60 * 60_000;

export type AdminRequestStatus = "success" | "running" | "error";

export function isStaleRequest(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() >= STALE_REQUEST_AFTER_MS;
}

export function adminRequestStatus(status: string, createdAt: Date, now = Date.now()): AdminRequestStatus {
  if (status === "failed" || status === "error") return "error";
  if (status === "ready" || status === "success") return "success";
  if (status === "running" && isStaleRequest(createdAt, now)) return "error";
  if (status === "creating" && isStaleRequest(createdAt, now)) return "error";
  return "running";
}
