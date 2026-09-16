import type { Locale } from "@/lib/i18n/types";

const labels: Record<Locale, string> = {
  ru: "Без названия",
  en: "Untitled",
  zh: "未命名",
  hi: "बिना नाम",
  es: "Sin título",
  fr: "Sans titre",
  ar: "بدون عنوان",
  pt: "Sem título",
  de: "Ohne Titel",
  ja: "無題",
  it: "Senza titolo",
  ko: "제목 없음",
  tr: "İsimsiz",
  pl: "Bez tytułu",
  nl: "Naamloos",
  sv: "Namnlös",
  cs: "Bez názvu",
  el: "Χωρίς τίτλο",
  ro: "Fără titlu",
};

export function untitledTrackLabel(locale: Locale): string {
  return labels[locale] ?? labels.en;
}
