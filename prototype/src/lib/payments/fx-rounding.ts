/** Шаги округления нац. суммы: 100 → 10 → 0 → 0,0 → 0,00 */
export const FX_ROUNDING_STEPS = [
  { code: -2, label: "100" },
  { code: -1, label: "10" },
  { code: 0, label: "0" },
  { code: 1, label: "0,0" },
  { code: 2, label: "0,00" },
] as const;

export type FxRoundingCode = (typeof FX_ROUNDING_STEPS)[number]["code"];

export function isFxRoundingCode(value: number | null): value is FxRoundingCode {
  return value !== null && FX_ROUNDING_STEPS.some((step) => step.code === value);
}

export function fxRoundingLabel(code: number): string {
  return FX_ROUNDING_STEPS.find((step) => step.code === code)?.label ?? "0,00";
}

export function stepFxRounding(code: number, direction: -1 | 1): FxRoundingCode {
  const index = Math.max(0, FX_ROUNDING_STEPS.findIndex((step) => step.code === code));
  const next = Math.min(FX_ROUNDING_STEPS.length - 1, Math.max(0, index + direction));
  return FX_ROUNDING_STEPS[next].code;
}
