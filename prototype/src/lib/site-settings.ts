export const DEFAULT_REGISTRATION_BONUS_THOUSANDS = 20;
export const MIN_REGISTRATION_BONUS_THOUSANDS = 1;
export const MAX_REGISTRATION_BONUS_THOUSANDS = 500;

export function registrationBonusTokensFromThousands(thousands: number): number {
  return thousands * 1_000;
}

export function parseRegistrationBonusThousands(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^-?\d+$/.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < MIN_REGISTRATION_BONUS_THOUSANDS || parsed > MAX_REGISTRATION_BONUS_THOUSANDS) return null;
  return parsed;
}
