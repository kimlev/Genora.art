export function normalizePin(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{4}$/.test(digits) ? digits : null;
}
