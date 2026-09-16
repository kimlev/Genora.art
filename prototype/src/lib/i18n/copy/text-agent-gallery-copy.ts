import type { Locale } from "@/lib/i18n/types";
import type { AgentCategory } from "@/lib/mock/agent-types";

export type TextAgentTag = "all" | Extract<AgentCategory, "analysis" | "writing" | "code" | "marketing">;

export const TEXT_AGENT_TAGS: TextAgentTag[] = ["all", "analysis", "writing", "code", "marketing"];

export type TextAgentGalleryCopy = {
  title: string;
  close: string;
  use: string;
  empty: string;
  none: string;
  tag: Record<TextAgentTag, string>;
};

const copies: Partial<Record<Locale, TextAgentGalleryCopy>> = {
  ru: { title: "Текстовые агенты", close: "Закрыть", use: "Использовать", empty: "В этом теге пока пусто.", none: "Без агента", tag: { all: "Все", analysis: "Анализ", writing: "Тексты", code: "Код", marketing: "Маркетинг" } },
  en: { title: "Text agents", close: "Close", use: "Use", empty: "Nothing in this tag yet.", none: "No agent", tag: { all: "All", analysis: "Analysis", writing: "Writing", code: "Code", marketing: "Marketing" } },
  es: { title: "Agentes de texto", close: "Cerrar", use: "Usar", empty: "Aún no hay nada en esta etiqueta.", none: "Sin agente", tag: { all: "Todos", analysis: "Análisis", writing: "Textos", code: "Código", marketing: "Marketing" } },
  fr: { title: "Agents texte", close: "Fermer", use: "Utiliser", empty: "Rien dans ce tag pour le moment.", none: "Sans agent", tag: { all: "Tous", analysis: "Analyse", writing: "Textes", code: "Code", marketing: "Marketing" } },
  de: { title: "Textagenten", close: "Schließen", use: "Nutzen", empty: "In diesem Tag ist noch nichts.", none: "Ohne Agent", tag: { all: "Alle", analysis: "Analyse", writing: "Texte", code: "Code", marketing: "Marketing" } },
  it: { title: "Agenti di testo", close: "Chiudi", use: "Usa", empty: "Niente in questo tag per ora.", none: "Nessun agente", tag: { all: "Tutti", analysis: "Analisi", writing: "Testi", code: "Codice", marketing: "Marketing" } },
  pt: { title: "Agentes de texto", close: "Fechar", use: "Usar", empty: "Ainda não há nada nesta etiqueta.", none: "Sem agente", tag: { all: "Todos", analysis: "Análise", writing: "Textos", code: "Código", marketing: "Marketing" } },
  pl: { title: "Agenci tekstowi", close: "Zamknij", use: "Użyj", empty: "W tym tagu na razie pusto.", none: "Bez agenta", tag: { all: "Wszystkie", analysis: "Analiza", writing: "Teksty", code: "Kod", marketing: "Marketing" } },
  tr: { title: "Metin ajanları", close: "Kapat", use: "Kullan", empty: "Bu etikette henüz bir şey yok.", none: "Ajansız", tag: { all: "Tümü", analysis: "Analiz", writing: "Metin", code: "Kod", marketing: "Pazarlama" } },
  sv: { title: "Textagenter", close: "Stäng", use: "Använd", empty: "Inget i den här taggen än.", none: "Ingen agent", tag: { all: "Alla", analysis: "Analys", writing: "Texter", code: "Kod", marketing: "Marknadsföring" } },
  cs: { title: "Textoví agenti", close: "Zavřít", use: "Použít", empty: "V tomto štítku zatím nic není.", none: "Bez agenta", tag: { all: "Vše", analysis: "Analýza", writing: "Texty", code: "Kód", marketing: "Marketing" } },
  hi: { title: "टेक्स्ट एजेंट", close: "बंद करें", use: "इस्तेमाल करें", empty: "इस टैग में अभी कुछ नहीं है।", none: "बिना एजेंट", tag: { all: "सभी", analysis: "विश्लेषण", writing: "लेखन", code: "कोड", marketing: "मार्केटिंग" } },
  ar: { title: "وكلاء النص", close: "إغلاق", use: "استخدام", empty: "لا يوجد شيء في هذه العلامة بعد.", none: "بدون وكيل", tag: { all: "الكل", analysis: "تحليل", writing: "نصوص", code: "برمجة", marketing: "تسويق" } },
};

export function textAgentGalleryCopy(locale: string): TextAgentGalleryCopy {
  return copies[locale as Locale] ?? copies.en!;
}
