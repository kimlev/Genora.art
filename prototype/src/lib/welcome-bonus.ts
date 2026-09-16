import { CREDIT_GLYPH, tokensToCredits } from "@/lib/credits";

export const WELCOME_BONUS_TASKS = ["login", "texts", "images", "tracks", "friends"] as const;
export type WelcomeBonusTaskId = (typeof WELCOME_BONUS_TASKS)[number];

export type WelcomeBonusTaskConfig = {
  maxBonus: number;
  required: number;
};

export type WelcomeBonusConfig = Record<WelcomeBonusTaskId, WelcomeBonusTaskConfig>;

export const DEFAULT_WELCOME_BONUS_CONFIG: WelcomeBonusConfig = {
  login: { maxBonus: 10_000, required: 5 },
  texts: { maxBonus: 10_000, required: 20 },
  images: { maxBonus: 20_000, required: 10 },
  tracks: { maxBonus: 20_000, required: 5 },
  friends: { maxBonus: 40_000, required: 5 },
};

export function parseWelcomeBonusConfig(value: unknown): WelcomeBonusConfig | null {
  if (!value || typeof value !== "object") return null;
  const next = { ...DEFAULT_WELCOME_BONUS_CONFIG };
  for (const key of WELCOME_BONUS_TASKS) {
    const raw = (value as Record<string, unknown>)[key];
    if (!raw || typeof raw !== "object") return null;
    const maxBonus = Number((raw as { maxBonus?: unknown }).maxBonus);
    const required = Number((raw as { required?: unknown }).required);
    if (!Number.isInteger(maxBonus) || maxBonus < 0 || maxBonus > 1_000_000) return null;
    if (!Number.isInteger(required) || required < 1 || required > 1_000) return null;
    next[key] = { maxBonus, required };
  }
  return next;
}

export function welcomeBonusTotal(config: WelcomeBonusConfig): number {
  return WELCOME_BONUS_TASKS.reduce((sum, key) => sum + config[key].maxBonus, 0);
}

export function taskEarnedTokens(config: WelcomeBonusTaskConfig, progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= config.required) return config.maxBonus;
  return Math.floor((config.maxBonus / config.required) * progress);
}

export function formatWelcomeTokens(tokens: number, locale = "ru"): string {
  if (tokens <= 0) return `+0\u00a0${CREDIT_GLYPH}`;
  const credits = tokensToCredits(tokens, "price");
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(credits) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(credits);
  return `+${value}\u00a0${CREDIT_GLYPH}`;
}

export function welcomeBonusCreditAt(startedAt: Date | string): string {
  const date = new Date(startedAt);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString();
}

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function utcYesterday(today: string): string {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function alreadyCountedLoginDay(current: string[], lastLoginUtc: string | null, today: string): boolean {
  return lastLoginUtc === today || current.includes(today);
}

/** Consecutive UTC login days. One calendar day = one login, even after logout. */
export function nextLoginDays(current: string[], lastLoginUtc: string | null, today: string, required: number): string[] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  if (alreadyCountedLoginDay(current, lastLoginUtc, today)) return null;
  const seen = [...new Set(current.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))];
  const next = lastLoginUtc === utcYesterday(today) ? [...seen, today] : [today];
  return next.slice(-Math.max(1, required));
}

export function msUntilNextUtcMidnight(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
}

export type WelcomeBonusTaskProgress = {
  id: WelcomeBonusTaskId;
  progress: number;
  required: number;
  maxBonus: number;
  earned: number;
  done: boolean;
};

export type WelcomeBonusProgress = {
  active: boolean;
  version: number;
  config: WelcomeBonusConfig;
  total: number;
  earned: number;
  endsAt: string;
  creditAt: string;
  showTeaser: boolean;
  referralCode: string;
  referralUrl: string;
  credited: boolean;
  loginDays: string[];
  tasks: WelcomeBonusTaskProgress[];
};
