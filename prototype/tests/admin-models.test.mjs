import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminModelRows,
  classifyModelKind,
  filterAdminModels,
  imageAverageRequestCost,
  summarizeAdminModels,
} from "../src/lib/admin-models.ts";

test("model kinds map to admin labels", () => {
  assert.equal(classifyModelKind("gpt-4o", "text"), "text");
  assert.equal(classifyModelKind("flux-pro", "image"), "image");
  assert.equal(classifyModelKind("suno-v4", "text"), "audio");
  assert.equal(classifyModelKind("veo-3.1", "text"), "video");
});

test("image average price prefers integrator value then size prices", () => {
  assert.equal(imageAverageRequestCost({ average_request_cost_usd: 0.12 }), 0.12);
  assert.equal(imageAverageRequestCost({ price_per_image_usd: { "1024": 0.04, "2048": 0.08 } }), 0.06);
});

test("filters and summary use only the applied provider and model", () => {
  const rows = buildAdminModelRows([
    { id: "gpt-4o", name: "GPT-4o", providerId: "openai", provider: "OpenAI", source: "text", averageRequestCostUsd: 0.02 },
    { id: "flux", name: "Flux", providerId: "black-forest", provider: "Black Forest", source: "image", averageRequestCostUsd: 0.04 },
  ], [
    { model: "GPT-4o", modelId: "gpt-4o", revenueUsd: 10, costUsd: 4 },
    { model: "Flux", modelId: "flux", revenueUsd: 6, costUsd: 2 },
  ]);
  const openai = filterAdminModels(rows, "openai", "");
  const images = filterAdminModels(rows, "", "", "image");
  const summary = summarizeAdminModels(openai);
  assert.equal(openai.length, 1);
  assert.equal(openai[0].kindLabel, "Чаты");
  assert.equal(images.length, 1);
  assert.equal(images[0].kind, "image");
  assert.equal(summary.models, 1);
  assert.equal(summary.averagePrice, 0.02);
  assert.equal(summary.revenueUsd, 10);
  assert.equal(summary.costUsd, 4);
});
