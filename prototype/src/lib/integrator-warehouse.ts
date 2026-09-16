export type WarehouseStatus = "in_progress" | "ready" | "error" | "expired" | "acked" | string;

export function warehousePollDelay(elapsedMs: number): number {
  if (elapsedMs < 15_000) return 2_000;
  if (elapsedMs < 60_000) return 5_000;
  return 10_000;
}

export function isWarehouseTerminal(status: string): boolean {
  return status === "ready" || status === "error" || status === "expired";
}
