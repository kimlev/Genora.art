import "server-only";
import { integratorGetRequest } from "@/lib/server/integrator";

export type MediaJobOutcome<T> = {
  status: "ready" | "in_progress" | "error" | "expired" | "unavailable";
  result: T | null;
};

export async function mediaJobOutcome<T>(requestId: string, fail: (reason: string) => Promise<void>): Promise<MediaJobOutcome<T>> {
  const hold = await integratorGetRequest(requestId).catch(() => null);
  if (!hold) return { status: "unavailable", result: null };
  if (hold.status === "ready") return { status: "ready", result: (hold.result ?? hold) as T };
  if (hold.status === "error" || hold.status === "expired") {
    await fail(hold.error || hold.status);
    return { status: hold.status, result: null };
  }
  return { status: "in_progress", result: null };
}

export async function mediaJobResult<T>(requestId: string, fail: (reason: string) => Promise<void>): Promise<T | null> {
  return (await mediaJobOutcome<T>(requestId, fail)).result;
}

export async function mediaFailureIsFinal(error: unknown, requestId: string, started: boolean, received: boolean) {
  if (received) return false; // Paid result exists: retry local persistence, never refund a storage outage.
  if (!started) return true; // Slot acquisition/local validation failed before the provider call.
  const hold = await integratorGetRequest(requestId).catch(() => null);
  if (hold) return hold.status === "error" || hold.status === "expired";
  const status = Number((error as { statusCode?: number } | null)?.statusCode);
  // Transport/server failures are ambiguous; a provider may still be generating.
  return status >= 400 && status < 500 && ![408, 409].includes(status);
}
