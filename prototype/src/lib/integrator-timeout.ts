export const REQUEST_TIMEOUT_MS = 12 * 60_000;

export function integratorRequestTimeoutMs(input: {
  provider?: string;
  model?: string;
  memoryDepth?: string;
  timeoutMs?: number;
}) {
  return input.timeoutMs ?? REQUEST_TIMEOUT_MS;
}
