import type { PasswordStrengthKey } from "@/lib/i18n/copy/auth-ui";

export type { PasswordStrengthKey };

export type PasswordStrength = {
  level: 1 | 2 | 3 | 4;
  key: PasswordStrengthKey;
};

const KEYS_BY_LEVEL: Record<1 | 2 | 3 | 4, PasswordStrengthKey> = {
  1: "weak",
  2: "fair",
  3: "good",
  4: "strong",
};

export function passwordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
    .filter((pattern) => pattern.test(password)).length;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (categories >= 3) score += 1;
  if (password.length >= 14 && categories === 4) score += 1;
  const level = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;

  return { level, key: KEYS_BY_LEVEL[level] };
}
