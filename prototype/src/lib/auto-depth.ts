import type { Locale } from "@/lib/locale-from-request";

export type RoutedDepth = "fast" | "balanced" | "deep";

/** Иероглифы, кана и хангыль несут примерно втрое больше смысла, чем буква латиницы или кириллицы */
const DENSE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const DENSE_CHARACTER_WEIGHT = 3;

const LONG_PROMPT = 900;
const SHORT_PROMPT = 220;

/**
 * Просьбы разобраться, доказать, сравнить, отладить — на каждом языке сайта.
 * Короткий запрос вроде «сравни варианты» требует рассуждения, по длине его не отличить.
 */
const REASONING_HINTS: Record<Locale, RegExp> = {
  ru: /докаж|доказ|проанализ|анализ|архитект|отлад|сравн|рассужд|обоснуй|пошагов|почему/i,
  en: /prove|analy[sz]|architect|debug|compare|comparison|reasoning|why does|why is|step by step|trade-?off/i,
  zh: /证明|分析|架构|调试|对比|比较|推理|为什么|为何|逐步|权衡/,
  hi: /सिद्ध|विश्लेषण|आर्किटेक्चर|डिबग|तुलना|तर्क|क्यों|चरण दर चरण/,
  es: /demuestr|analiz|análisis|arquitectur|depura|compar|razona|por qué|paso a paso/i,
  fr: /démontr|analys|architectur|débogu|compar|raisonn|pourquoi|étape par étape/i,
  ar: /أثبت|تحليل|حلّل|معمارية|تصحيح الأخطاء|قارن|مقارنة|استدلال|لماذا|خطوة بخطوة/,
  pt: /prov|analis|análise|arquitetur|depura|compar|racioc|por que|por quê|passo a passo/i,
  de: /beweis|analys|architektur|debugg|vergleich|begründ|warum|schritt für schritt|abwäg/i,
  ja: /証明|分析|解析|アーキテクチャ|デバッグ|比較|推論|なぜ|理由|段階的/,
  it: /dimostr|analiz|analisi|architettur|debug|confront|ragiona|perché|passo per passo/i,
  ko: /증명|분석|아키텍처|디버그|디버깅|비교|추론|왜|단계별/,
  tr: /kanıtla|analiz|mimari|hata ayıkla|karşılaştır|akıl yürüt|neden|adım adım/i,
  pl: /udowod|analiz|architektur|debug|porówn|rozumow|uzasad|dlaczego|krok po kroku/i,
  nl: /bewijs|analys|architectuur|debug|vergelijk|beredeneer|waarom|stap voor stap|afweg/i,
  sv: /bevis|analys|arkitektur|debug|jämför|resoner|motiver|varför|steg för steg/i,
  cs: /dokaž|analyz|analýz|architektur|debug|porovn|uvažov|zdůvod|proč|krok za krokem/i,
  el: /απόδειξ|αποδείξ|ανάλυσ|αναλύσ|αρχιτεκτον|αποσφαλμάτωσ|σύγκρι|συγκρίν|συλλογι|γιατί|βήμα προς βήμα/i,
  ro: /demonstr|analiz|arhitectur|depan|debug|compar|raționa|argument|de ce|pas cu pas/i,
};

/** Технические просьбы часто пишут по-английски независимо от языка интерфейса */
const SHARED_HINTS = REASONING_HINTS.en;

/** Длина запроса, приведённая к латинице: иначе японский текст всегда выглядит коротким */
export function weightedPromptLength(prompt: string): number {
  let length = 0;
  for (const character of prompt) {
    length += DENSE_SCRIPT.test(character) ? DENSE_CHARACTER_WEIGHT : 1;
  }
  return length;
}

/** Код и запросы к базе данных — признак разбора или отладки, а не короткого вопроса */
function looksLikeCode(prompt: string): boolean {
  if (prompt.includes("```")) return true;
  const codeLines = prompt.split("\n").filter((line) =>
    /(?:^|\s)(?:function|class|def|import|export|const|let|var|public|private|return|SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i.test(line)
    || /[{};]\s*$/.test(line));
  return codeLines.length >= 2;
}

/** Перечисления и несколько вопросов подряд — задача составная, но не обязательно сложная */
function enumeratedLines(prompt: string): number {
  return prompt.split("\n").filter((line) => /^\s*(?:[-*•—]|\d+[.)])\s+\S/.test(line)).length;
}

function questionCount(prompt: string): number {
  return (prompt.match(/[?？؟]/gu) ?? []).length;
}

function hintsAtReasoning(prompt: string, locale?: Locale | null): boolean {
  if (SHARED_HINTS.test(prompt)) return true;
  if (locale) return REASONING_HINTS[locale].test(prompt);
  return Object.values(REASONING_HINTS).some((pattern) => pattern.test(prompt));
}

/**
 * Глубина ответа для режима «авто». От неё же зависит глубина памяти чата,
 * поэтому признаки не должны зависеть от языка запроса.
 */
export function automaticDepth(
  prompt: string,
  options: { supportsReasoning: boolean; locale?: Locale | null },
): RoutedDepth {
  if (!options.supportsReasoning) return "fast";
  const length = weightedPromptLength(prompt);
  if (length > LONG_PROMPT) return "deep";
  if (looksLikeCode(prompt)) return "deep";
  if (hintsAtReasoning(prompt, options.locale)) return "deep";
  if (enumeratedLines(prompt) >= 3 || questionCount(prompt) >= 2) return "balanced";
  if (length < SHORT_PROMPT) return "fast";
  return "balanced";
}
