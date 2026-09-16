import assert from "node:assert/strict";
import test from "node:test";

import { searchTargetsForLocale } from "../src/lib/search-routing.ts";

test("sends Russian pages to both engines", () => {
  assert.deepEqual(searchTargetsForLocale("ru"), ["yandex", "google"]);
});

test("sends every other language to Google only", () => {
  for (const locale of ["en", "de", "zh", "hi", "ar", "pt", "ro"]) {
    assert.deepEqual(searchTargetsForLocale(locale), ["google"]);
  }
});
