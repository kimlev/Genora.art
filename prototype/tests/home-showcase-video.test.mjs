import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../src/components/landing/hero-showcase.tsx", import.meta.url);
const videoUrl = new URL("../public/landing/genora-home-video.mp4", import.meta.url);
const posterUrl = new URL("../public/landing/genora-showcase-first-frame.jpg", import.meta.url);

test("homepage video card uses the Genora showcase and its first-frame poster", async () => {
  const [component, video, poster] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(videoUrl),
    readFile(posterUrl),
  ]);

  assert.match(component, /const showcaseVideo = "\/landing\/genora-home-video\.mp4"/);
  assert.match(component, /const showcasePoster = "\/landing\/genora-showcase-first-frame\.jpg"/);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.deepEqual([...poster.subarray(0, 3)], [0xff, 0xd8, 0xff]);
});
