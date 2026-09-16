import "server-only";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function jsonTopUpError(message: string, balanceTokens?: number): Response {
  return Response.json(
    Number.isFinite(balanceTokens) ? { error: message, balanceTokens } : { error: message },
    { status: 402 },
  );
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowedOrigins = new Set([
    new URL(request.url).origin,
    ...(process.env.APP_ORIGIN ?? "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ]);
  return allowedOrigins.has(origin.replace(/\/$/, ""));
}
