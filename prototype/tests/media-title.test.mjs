import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalizeMediaTitle } from "../src/lib/media-title.ts";
import { mediaTitleCopy } from "../src/lib/i18n/copy/media-title.ts";
import { SERVED_LOCALE_CODES } from "../src/lib/i18n/served-locales.ts";
import { sortModelsByStrength } from "../src/lib/catalog/model-rank.ts";

test("media names are optional, trimmed, 4–30 Unicode characters", () => {
  for (const input of ["", "    ", " Name ", "Тест", "a".repeat(30), "😀".repeat(30)]) assert.equal(normalizeMediaTitle(input), input.trim());
  for (const input of [null, 4, {}, "abc", "a".repeat(31), "😀".repeat(31)]) assert.equal(normalizeMediaTitle(input), null);
  for (const locale of SERVED_LOCALE_CODES) assert.ok(mediaTitleCopy(locale).hint);
});
test("title edit remains per asset with ownership checks; only prompt panel scrolls", async () => {
  const route = await readFile(new URL("../src/app/api/media/titles/[assetId]/route.ts", import.meta.url), "utf8");
  assert.match(route, /requireUser\(\)/);
  assert.match(route, /isSameOrigin\(request\)/);
  assert.match(route, /g\.user_id=\$1 AND c\.user_id=\$1 AND \$3=ANY\(g\.asset_ids\)/);
  assert.match(route, /ON CONFLICT \(user_id,kind,asset_id\)/);
  const dialog = await readFile(new URL("../src/components/images/media-prompt-dialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /flex-col overflow-hidden/);
  assert.equal(dialog.match(/overflow-y-auto/g)?.length, 1);
  const studio = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /imageItem\.title \|\| generation\.prompt/);
});
test("OpenAI Pro follows Sol, Terra and Luna everywhere using the shared ordering", () => {
  const ids = ["gpt-5.5-pro", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.6-sol"];
  assert.deepEqual(sortModelsByStrength(ids.map((id) => ({ id }))).map((m) => m.id), ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5-pro"]);
});
