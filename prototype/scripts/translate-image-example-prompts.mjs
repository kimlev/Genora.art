#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "src/lib/catalog/image-examples-data.json");
const baseUrl = process.env.INTEGRATOR_BASE_URL?.trim().replace(/\/$/, "");
const apiKey = process.env.INTEGRATOR_API_KEY?.trim();
if (!baseUrl || !apiKey) {
  console.error("Need INTEGRATOR_BASE_URL and INTEGRATOR_API_KEY");
  process.exit(1);
}

const LOCALES = {
  en: { lang: "English", headers: ["Subject", "Action", "Setting", "Style", "Details", "Light", "Constraints"] },
  zh: { lang: "Simplified Chinese", headers: ["对象", "动作", "环境", "风格", "细节", "光线", "限制"] },
  hi: { lang: "Hindi", headers: ["विषय", "क्रिया", "परिवेश", "शैली", "विवरण", "प्रकाश", "सीमाएँ"] },
  es: { lang: "Spanish", headers: ["Objeto", "Acción", "Entorno", "Estilo", "Detalles", "Luz", "Restricciones"] },
  fr: { lang: "French", headers: ["Objet", "Action", "Environnement", "Style", "Détails", "Lumière", "Contraintes"] },
  ar: { lang: "Arabic", headers: ["الموضوع", "الفعل", "المحيط", "الأسلوب", "التفاصيل", "الضوء", "القيود"] },
  pt: { lang: "Portuguese", headers: ["Objeto", "Ação", "Ambiente", "Estilo", "Detalhes", "Luz", "Restrições"] },
  de: { lang: "German", headers: ["Objekt", "Handlung", "Umgebung", "Stil", "Details", "Licht", "Einschränkungen"] },
  ja: { lang: "Japanese", headers: ["対象", "動作", "環境", "スタイル", "細部", "光", "制約"] },
  it: { lang: "Italian", headers: ["Oggetto", "Azione", "Ambiente", "Stile", "Dettagli", "Luce", "Vincoli"] },
  ko: { lang: "Korean", headers: ["대상", "동작", "환경", "스타일", "세부", "빛", "제한"] },
  tr: { lang: "Turkish", headers: ["Nesne", "Eylem", "Ortam", "Stil", "Ayrıntılar", "Işık", "Kısıtlar"] },
  pl: { lang: "Polish", headers: ["Obiekt", "Działanie", "Otoczenie", "Styl", "Szczegóły", "Światło", "Ograniczenia"] },
  nl: { lang: "Dutch", headers: ["Onderwerp", "Handeling", "Omgeving", "Stijl", "Details", "Licht", "Beperkingen"] },
  sv: { lang: "Swedish", headers: ["Objekt", "Handling", "Miljö", "Stil", "Detaljer", "Ljus", "Begränsningar"] },
  cs: { lang: "Czech", headers: ["Objekt", "Děj", "Prostředí", "Styl", "Detaily", "Světlo", "Omezení"] },
  el: { lang: "Greek", headers: ["Αντικείμενο", "Δράση", "Περιβάλλον", "Στυλ", "Λεπτομέρειες", "Φως", "Περιορισμοί"] },
  ro: { lang: "Romanian", headers: ["Obiect", "Acțiune", "Mediu", "Stil", "Detalii", "Lumină", "Restricții"] },
};

const provider = process.env.TRANSLATE_PROVIDER || "google";
const model = process.env.TRANSLATE_MODEL || "gemini-3.6-flash";
const force = process.argv.includes("--force");
const onlyLocales = process.argv.slice(2).filter((value) => value !== "--force" && !value.startsWith("--"));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonArray(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("no json array");
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("not an array");
  return parsed.map((item) => String(typeof item === "object" && item ? item.prompt || item.text || "" : item).trim());
}

function normalizeTranslation(text, headers) {
  const lines = String(text).split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 7) return null;
  const next = [];
  for (const [index, header] of headers.entries()) {
    const prefix = new RegExp(`^${header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`);
    if (!prefix.test(lines[index])) return null;
    next.push(`${header}: ${lines[index].replace(prefix, "").trim()}`);
  }
  return next.join("\n");
}

async function chat(messages) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider,
        model,
        messages,
        chat_id: `image-examples-translate-${Date.now()}-${attempt}`,
        memory_depth: "shallow",
        source: "Genora.art · перевод примеров картинок",
        max_output_tokens: 8000,
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 429 || response.status === 503) {
      lastError = new Error(payload?.message || `HTTP ${response.status}`);
      await sleep(1000);
      continue;
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!response.ok || !content) {
      throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    }
    return content;
  }
  throw lastError || new Error("retry failed");
}

async function translateBatch(locale, items) {
  const spec = LOCALES[locale];
  const headers = spec.headers.join(", ");
  const content = await chat([
    {
      role: "system",
      content: `Translate image-generation prompts from Russian into ${spec.lang}.
Keep exactly 7 lines in this order, each starting with these exact headers plus a colon: ${headers}.
Keep the same facts, people, objects, light and constraints. Do not add or drop details.
Return a JSON array of strings only, same order and same count as the input.`,
    },
    {
      role: "user",
      content: JSON.stringify(items.map((item) => ({ id: item.id, prompt: item.prompt.ru }))),
    },
  ]);
  const translated = parseJsonArray(content);
  if (translated.length !== items.length) throw new Error(`count ${translated.length} != ${items.length}`);
  return translated.map((text, index) => {
    const normalized = normalizeTranslation(text, spec.headers);
    if (!normalized) throw new Error(`bad shape ${items[index].id} ${locale}`);
    return normalized;
  });
}

const examples = JSON.parse(await readFile(dataPath, "utf8"));
const locales = (onlyLocales.length ? onlyLocales : Object.keys(LOCALES)).filter((locale) => LOCALES[locale]);
const batchSize = 5;
const localeConcurrency = 3;
let written = 0;
let skipped = 0;
let failed = 0;
let saveQueue = Promise.resolve();

function save() {
  saveQueue = saveQueue.then(() => writeFile(dataPath, `${JSON.stringify(examples, null, 2)}\n`));
  return saveQueue;
}

async function translateLocale(locale) {
  const pending = examples.filter((example) => force || !example.prompt[locale]);
  skipped += examples.length - pending.length;
  for (let index = 0; index < pending.length; index += batchSize) {
    const batch = pending.slice(index, index + batchSize);
    try {
      const translated = await translateBatch(locale, batch);
      batch.forEach((example, offset) => {
        example.prompt[locale] = translated[offset];
      });
      written += batch.length;
      await save();
      console.log(`ok ${locale} ${batch.map((item) => item.slot).join(",")}`);
    } catch (error) {
      console.log(`retry ${locale} ${batch.map((item) => item.slot).join(",")}`, error instanceof Error ? error.message : error);
      for (const example of batch) {
        try {
          const [translated] = await translateBatch(locale, [example]);
          example.prompt[locale] = translated;
          written += 1;
          await save();
          console.log(`ok ${locale} ${example.slot}`);
        } catch (singleError) {
          failed += 1;
          console.log(`FAIL ${locale} ${example.slot}`, singleError instanceof Error ? singleError.message : singleError);
        }
      }
    }
  }
}

let cursor = 0;
async function worker() {
  while (cursor < locales.length) {
    const locale = locales[cursor];
    cursor += 1;
    await translateLocale(locale);
  }
}

await Promise.all(Array.from({ length: Math.min(localeConcurrency, locales.length) }, () => worker()));

console.log(JSON.stringify({ written, skipped, failed, locales: locales.length }));
if (failed) process.exit(2);
