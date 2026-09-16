import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import { createGalleryPreview, optimizeAgentCover } from "../src/lib/server/image-optimization.ts";

test("gallery preview is a bounded webp thumbnail", async () => {
  const original = await sharp({
    create: { width: 1800, height: 1200, channels: 3, background: "#76a9ef" },
  }).jpeg({ quality: 95 }).toBuffer();
  const preview = await createGalleryPreview(original, "image/jpeg");
  assert.ok(preview);
  assert.equal(preview.mime, "image/webp");
  const metadata = await sharp(preview.bytes).metadata();
  assert.ok((metadata.width ?? 0) <= 640);
  assert.ok((metadata.height ?? 0) <= 640);
});

test("agent cover is optimized automatically and invalid media falls back safely", async () => {
  const original = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#152238" },
  }).png().toBuffer();
  const optimized = await optimizeAgentCover(original, "image/png");
  assert.ok(optimized);
  const metadata = await sharp(optimized.bytes).metadata();
  assert.ok((metadata.width ?? 0) <= 1280);
  assert.equal(await createGalleryPreview(Buffer.from("not an image"), "text/plain"), null);
});
