import assert from "node:assert/strict";
import test from "node:test";

import {
  compatibleImageSizeForFormat,
  photoReferenceCap,
  photoRequiredCount,
  photoRequiredSlotsFilled,
  photoSlotCount,
  photoSlotLabel,
} from "../src/lib/catalog/image-studio.ts";

test("format selection keeps a compatible size or switches to one automatically", () => {
  const formatsBySize = { "1K": ["1:1"], "1.5K": ["2:3", "3:2"] };
  assert.equal(compatibleImageSizeForFormat({ sizes: ["1K", "1.5K"], formatsBySize, currentSize: "1K", format: "1:1" }), "1K");
  assert.equal(compatibleImageSizeForFormat({ sizes: ["1K", "1.5K"], formatsBySize, currentSize: "1K", format: "2:3" }), "1.5K");
  assert.equal(compatibleImageSizeForFormat({ sizes: ["1K", "1.5K"], formatsBySize, currentSize: "1.5K", format: "3:2" }), "1.5K");
});

test("model cap follows integrator max_reference_images up to 4", () => {
  assert.equal(photoReferenceCap(undefined, false), 0);
  assert.equal(photoReferenceCap(undefined, true), 1);
  assert.equal(photoReferenceCap(1, true), 1);
  assert.equal(photoReferenceCap(3, true), 3);
  assert.equal(photoReferenceCap(8, true), 4);
});

test("slot count shrinks with model and agent, templates stay at one", () => {
  assert.equal(photoSlotCount({ photoMode: "t2i", modelCap: 4 }), 0);
  assert.equal(photoSlotCount({ photoMode: "i2i", modelCap: 4 }), 4);
  assert.equal(photoSlotCount({ photoMode: "i2i", modelCap: 4, agentMax: 2 }), 2);
  assert.equal(photoSlotCount({ photoMode: "i2i", modelCap: 1, agentMax: 2 }), 1);
  assert.equal(photoSlotCount({ photoMode: "i2i", modelCap: 4, template: true }), 1);
});

test("required slots follow agent minimum and block generate until filled", () => {
  assert.equal(photoRequiredCount({ photoMode: "t2i" }), 0);
  assert.equal(photoRequiredCount({ photoMode: "i2i" }), 1);
  assert.equal(photoRequiredCount({ photoMode: "i2i", agentMin: 2 }), 2);
  assert.equal(photoRequiredSlotsFilled([null, { dataUrl: "x" }], 2), false);
  assert.equal(photoRequiredSlotsFilled([{ dataUrl: "a" }, { dataUrl: "b" }], 2), true);
});

test("slot labels stay numbered photos, not first/last frame", () => {
  assert.equal(photoSlotLabel("ru", 0), "Фото 1");
  assert.equal(photoSlotLabel("en", 3), "Photo 4");
  assert.equal(photoSlotLabel("pl", 1), "Zdjęcie 2");
});
