import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examples = JSON.parse(await readFile(join(root, "src/lib/catalog/image-examples-data.json"), "utf8"));
const locales = ["ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"];
const promptHeaders = {
  ru: ["Объект", "Действие", "Окружение", "Стиль", "Детали", "Свет", "Ограничения"],
  en: ["Subject", "Action", "Setting", "Style", "Details", "Light", "Constraints"],
  zh: ["对象", "动作", "环境", "风格", "细节", "光线", "限制"],
  hi: ["विषय", "क्रिया", "परिवेश", "शैली", "विवरण", "प्रकाश", "सीमाएँ"],
  es: ["Objeto", "Acción", "Entorno", "Estilo", "Detalles", "Luz", "Restricciones"],
  fr: ["Objet", "Action", "Environnement", "Style", "Détails", "Lumière", "Contraintes"],
  ar: ["الموضوع", "الفعل", "المحيط", "الأسلوب", "التفاصيل", "الضوء", "القيود"],
  pt: ["Objeto", "Ação", "Ambiente", "Estilo", "Detalhes", "Luz", "Restrições"],
  de: ["Objekt", "Handlung", "Umgebung", "Stil", "Details", "Licht", "Einschränkungen"],
  ja: ["対象", "動作", "環境", "スタイル", "細部", "光", "制約"],
  it: ["Oggetto", "Azione", "Ambiente", "Stile", "Dettagli", "Luce", "Vincoli"],
  ko: ["대상", "동작", "환경", "스타일", "세부", "빛", "제한"],
  tr: ["Nesne", "Eylem", "Ortam", "Stil", "Ayrıntılar", "Işık", "Kısıtlar"],
  pl: ["Obiekt", "Działanie", "Otoczenie", "Styl", "Szczegóły", "Światło", "Ograniczenia"],
  nl: ["Onderwerp", "Handeling", "Omgeving", "Stijl", "Details", "Licht", "Beperkingen"],
  sv: ["Objekt", "Handling", "Miljö", "Stil", "Detaljer", "Ljus", "Begränsningar"],
  cs: ["Objekt", "Děj", "Prostředí", "Styl", "Detaily", "Světlo", "Omezení"],
  el: ["Αντικείμενο", "Δράση", "Περιβάλλον", "Στυλ", "Λεπτομέρειες", "Φως", "Περιορισμοί"],
  ro: ["Obiect", "Acțiune", "Mediu", "Stil", "Detalii", "Lumină", "Restricții"],
};

function thumbPath(image) {
  return image.replace("/image-examples/", "/image-examples/thumbs/").replace(/\.jpg$/i, ".webp");
}

test("curated examples stay bound to the 39 placeholders", () => {
  assert.equal(examples.length, 39);
  assert.equal(examples[0].id, "01-ideogram-4-cinematic");
  assert.equal(examples[0].modelId, "ideogram-v4");
  assert.equal(examples[0].style, "cinematic");
  assert.equal(examples[10].modelId, "gpt-image-2");
  assert.equal(examples[10].format, "1:1");
  assert.equal(examples[37].id, "38-z-image-turbo-sauna");
  assert.equal(examples[38].id, "39-grok-imagine-still");
  const providers = [...new Set(examples.map((example) => example.providerLabel))];
  assert.ok(providers.includes("Ideogram"));
  for (const example of examples) {
    const prompt = example.prompt.ru;
    assert.ok(prompt.length >= 500 && prompt.length <= 1200, example.id);
    assert.match(example.image, /^\/image-examples\/[^/]+\.jpg$/);
    assert.match(thumbPath(example.image), /^\/image-examples\/thumbs\/.+\.webp$/);
    assert.match(prompt, /^Объект:/);
    assert.match(prompt, /Стиль:/);
    assert.match(prompt, /Ограничения:/);
    for (const locale of locales) {
      const localized = example.prompt[locale];
      assert.ok(localized, `${example.id} ${locale}`);
      const lines = localized.split("\n").map((line) => line.trim()).filter(Boolean);
      assert.equal(lines.length, 7, `${example.id} ${locale}`);
      promptHeaders[locale].forEach((header, index) => {
        assert.ok(lines[index].startsWith(`${header}:`), `${example.id} ${locale} ${header}`);
      });
    }
  }
});

test("grid thumbs stay small and match every original", async () => {
  let thumbsBytes = 0;
  for (const example of examples) {
    const original = join(root, "public", example.image.replace(/^\//, ""));
    const thumb = join(root, "public", thumbPath(example.image).replace(/^\//, ""));
    await access(original);
    await access(thumb);
    const thumbSize = (await stat(thumb)).size;
    assert.ok(thumbSize > 800, example.id);
    assert.ok(thumbSize < 120_000, `${example.id} ${thumbSize}`);
    thumbsBytes += thumbSize;
  }
  assert.ok(thumbsBytes < 1.8 * 1024 * 1024, thumbsBytes);
});
