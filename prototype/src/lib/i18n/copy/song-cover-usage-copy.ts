import type { Locale } from "@/lib/i18n/types";

type SongCoverUsageCopy = {
  conversationTitle: (title: string) => string;
  generation: (model: string) => string;
  comment: string;
};

const titles: Record<Locale, string> = {
  ru: "Обложка: {title}",
  en: "Cover: {title}",
  zh: "封面：{title}",
  hi: "कवर: {title}",
  es: "Portada: {title}",
  fr: "Pochette : {title}",
  ar: "الغلاف: {title}",
  pt: "Capa: {title}",
  de: "Cover: {title}",
  ja: "カバー: {title}",
  it: "Copertina: {title}",
  ko: "커버: {title}",
  tr: "Kapak: {title}",
  pl: "Okładka: {title}",
  nl: "Omslag: {title}",
  sv: "Omslag: {title}",
  cs: "Obal: {title}",
  el: "Εξώφυλλο: {title}",
  ro: "Copertă: {title}",
};

const generations: Record<Locale, string> = {
  ru: "Генерация обложки · {model}",
  en: "Cover generation · {model}",
  zh: "封面生成 · {model}",
  hi: "कवर जनरेशन · {model}",
  es: "Generación de portada · {model}",
  fr: "Génération de pochette · {model}",
  ar: "توليد الغلاف · {model}",
  pt: "Geração da capa · {model}",
  de: "Cover-Erzeugung · {model}",
  ja: "カバー生成 · {model}",
  it: "Generazione copertina · {model}",
  ko: "커버 생성 · {model}",
  tr: "Kapak üretimi · {model}",
  pl: "Generowanie okładki · {model}",
  nl: "Omslag genereren · {model}",
  sv: "Omslagsgenerering · {model}",
  cs: "Generování obalu · {model}",
  el: "Δημιουργία εξωφύλλου · {model}",
  ro: "Generare copertă · {model}",
};

const comments: Record<Locale, string> = {
  ru: "Обложка песни",
  en: "Song cover",
  zh: "歌曲封面",
  hi: "गाने का कवर",
  es: "Portada de la canción",
  fr: "Pochette de la chanson",
  ar: "غلاف الأغنية",
  pt: "Capa da canção",
  de: "Songcover",
  ja: "曲のカバー",
  it: "Copertina della canzone",
  ko: "노래 커버",
  tr: "Şarkı kapağı",
  pl: "Okładka piosenki",
  nl: "Nummeromslag",
  sv: "Låtomslag",
  cs: "Obal písně",
  el: "Εξώφυλλο τραγουδιού",
  ro: "Coperta piesei",
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

export function songCoverUsageCopy(locale: Locale): SongCoverUsageCopy {
  const code = titles[locale] ? locale : "en";
  return {
    conversationTitle: (title) => fill(titles[code], { title: title.trim().slice(0, 80) || "—" }),
    generation: (model) => fill(generations[code], { model }),
    comment: comments[code],
  };
}
