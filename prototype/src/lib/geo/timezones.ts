import type { Locale } from "@/lib/i18n";
import { timezoneCityI18n } from "./timezone-cities";

export type TimezoneOption = { id: string; city: string; offset: string; label: string };

const LOCALES: Locale[] = [
  "ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro",
];

function ianaCity(id: string): string {
  return id.split("/").pop()?.replace(/_/g, " ") ?? id;
}

/** Текущее смещение зоны относительно UTC, с учётом летнего времени. */
export function timezoneUtcOffset(id: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "shortOffset" }).formatToParts(at);
  const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "UTC";
  const match = raw.replace(/^GMT/, "UTC").match(/UTC([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "UTC+0";
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (!hours && !minutes) return "UTC+0";
  return minutes ? `UTC${match[1]}${hours}:${String(minutes).padStart(2, "0")}` : `UTC${match[1]}${hours}`;
}

export function timezoneCityName(id: string, locale: string): string {
  const lang = (LOCALES.includes(locale as Locale) ? locale : "en") as Locale;
  const translated = timezoneCityI18n[id]?.[lang] ?? timezoneCityI18n[id]?.en;
  return translated || ianaCity(id);
}

export function timezoneLabel(id: string, locale: string, at = new Date()): string {
  return `${timezoneCityName(id, locale)} · ${timezoneUtcOffset(id, at)}`;
}

export function timezoneIds(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** Список для выбора: все зоны IANA, подписи на языке интерфейса, сортировка по городу. */
export function timezoneOptions(locale: string, at = new Date()): TimezoneOption[] {
  const collator = new Intl.Collator(locale);
  return timezoneIds()
    .map((id) => {
      const city = timezoneCityName(id, locale);
      const offset = timezoneUtcOffset(id, at);
      return { id, city, offset, label: `${city} · ${offset}` };
    })
    .sort((left, right) => collator.compare(left.city, right.city) || left.offset.localeCompare(right.offset));
}
