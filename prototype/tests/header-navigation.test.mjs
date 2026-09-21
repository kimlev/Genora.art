import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const locales = ["ar", "cs", "de", "el", "en", "es", "fr", "hi", "it", "ja", "ko", "nl", "pl", "pt", "ro", "ru", "sv", "tr", "zh"];

test("site header keeps the requested landing-section order", async () => {
  const header = await readFile(join(root, "src/components/layout/site-header.tsx"), "utf8");
  const expected = ["#why", "#agents", "#songs", "#arena-ai", "#image-generation", "#pricing", "#blog", "#faq"];
  assert.deepEqual([...header.matchAll(/hash: "([^"]+)"/g)].map((match) => match[1]), expected);
});

test("every served locale has a translated Songs navigation label", async () => {
  for (const locale of locales) {
    const content = await readFile(join(root, "src/lib/i18n/locales", `${locale}.ts`), "utf8");
    assert.match(content, /nav:\s*\{[\s\S]*?agents:[^\n]+\n\s*songs:\s*[^\n]+\n\s*pricing:/, locale);
  }
});
