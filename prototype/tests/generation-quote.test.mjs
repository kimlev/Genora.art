import assert from "node:assert/strict";
import test from "node:test";
import { quoteImage, quoteMusic, quoteVideo } from "../src/lib/server/generation-quote.ts";
import { mediaFailureIsFinal, mediaJobResult } from "../src/lib/server/media-job-outcome.ts";

test("photo reservation matches per-image displayed price and count", () => {
  const model = { price_per_image_usd: { "1K": 0.04, "1K:high": 0.08 }, reasoning: null };
  assert.equal(quoteImage(model, "1K", undefined, 4, 2.5), 4000);
  assert.equal(quoteImage(model, "1K", "high", 2, 2.5), 4000);
  assert.equal(quoteImage({ price_per_image_usd: { "2K": 0.08 }, reasoning: { defaultValue: "high" } }, "2K", "high", 1, 2.5), 2000);
  assert.throws(() => quoteImage(model, "8K", undefined, 1, 2.5), /PRICE_UNAVAILABLE/);
  assert.throws(() => quoteImage(model, "1K", undefined, 1, 0), /PRICE_UNAVAILABLE/);
});

test("video reserves displayed per-second tariff including sound and duration", () => {
  const model = { resolutions: ["720p"], sound_modes: ["off", "on"], price_per_second_usd: { "720p": 0.03 }, price_per_second_with_audio_usd: { "720p": 0.06 } };
  assert.equal(quoteVideo(model, "720p", "off", 8, 2.5), 6400);
  assert.equal(quoteVideo(model, "720p", "on", 8, 2.5), 12000);
  assert.throws(() => quoteVideo(model, "4K", "off", 8, 2.5), /PRICE_UNAVAILABLE/);
});

test("song quote supports fixed track, minute and auto-duration tariffs", () => {
  assert.equal(quoteMusic({ billing_unit: "track", price_per_track_usd: 0.1 }, 120, 2.5), 2500);
  assert.equal(quoteMusic({ billing_unit: "audio_minute", price_per_minute_usd: 0.1 }, 180, 2.5), 7500);
  assert.equal(quoteMusic({ billing_unit: "audio_second", price_per_second_usd: 0.01, default_duration: 180 }, undefined, 2.5), 45000);
});

test("only definitive failures refund; network or local persistence failure retains hold", async () => {
  const original = globalThis.fetch;
  const env = { url: process.env.INTEGRATOR_BASE_URL, key: process.env.INTEGRATOR_API_KEY };
  process.env.INTEGRATOR_BASE_URL = "https://integrator.invalid";
  process.env.INTEGRATOR_API_KEY = "test-only";
  try {
    for (const status of ["ready", "in_progress"]) {
      globalThis.fetch = async () => Response.json({ status, result: { ok: true } });
      assert.equal(await mediaFailureIsFinal(new Error("network"), "test", true, false), false);
    }
    globalThis.fetch = async () => Response.json({ status: "error", error: "provider failed" });
    assert.equal(await mediaFailureIsFinal(new Error("failed"), "test", true, false), true);
    assert.equal(await mediaFailureIsFinal(new Error("storage"), "test", true, true), false);
    let refunds = 0;
    assert.equal(await mediaJobResult("test", async () => { refunds++; }), null);
    assert.equal(refunds, 1);
    globalThis.fetch = async () => { throw new Error("network"); };
    assert.equal(await mediaFailureIsFinal(new Error("timeout"), "test", true, false), false);
    assert.equal(await mediaFailureIsFinal(new Error("IMAGE_BUSY"), "test", false, false), true);
    assert.equal(await mediaFailureIsFinal({ statusCode: 400 }, "test", true, false), true);
    assert.equal(await mediaFailureIsFinal({ statusCode: 422 }, "test", true, false), true);
    assert.equal(await mediaFailureIsFinal({ statusCode: 502 }, "test", true, false), false);
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of [["INTEGRATOR_BASE_URL", env.url], ["INTEGRATOR_API_KEY", env.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
