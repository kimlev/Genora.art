import assert from "node:assert/strict";
import test from "node:test";

import { modelDisplayName } from "../src/lib/catalog/model-name.ts";

test("drops the Russian note the integrator adds to a model name", () => {
  assert.equal(modelDisplayName("Gemini 3.6 Flash \u00b7 актуальная"), "Gemini 3.6 Flash");
});

test("keeps ordinary names untouched", () => {
  for (const name of ["GPT-5.6 Terra", "Claude Opus 5", "Qwen 3.7 Max", "o3"]) {
    assert.equal(modelDisplayName(name), name);
  }
});
