import assert from "node:assert/strict";
import test from "node:test";

import { publicVideoGeneration, publicVideoJob } from "../src/lib/server/video-jobs.ts";

test("video history exposes a lightweight preview next to the original asset", () => {
  const generation = publicVideoGeneration({
    conversation_id: "conversation",
    request_id: "request",
    provider: "provider",
    model_id: "model",
    model_label: "Model",
    prompt: "Prompt",
    mode: "text-to-video",
    duration_sec: 8,
    resolution: "720p",
    aspect_ratio: "16:9",
    sound: "off",
    style: "auto",
    asset_ids: ["video-asset"],
    billed_tokens: "1",
    created_at: new Date(0),
  });

  assert.deepEqual(generation.images[0], {
    id: "video-asset",
    url: "/api/video/assets/video-asset",
    previewUrl: "/api/video/assets/video-asset?variant=preview",
  });
});

test("failed video hides the subprocessor and its request id from the user", () => {
  const job = publicVideoJob({
    id: "job-1",
    user_id: "user-1",
    conversation_id: "conversation-1",
    status: "failed",
    provider: "bytedance",
    model_id: "seedance-2.0-fast",
    model_label: "Seedance 2.0 Fast",
    prompt: "test",
    mode: "text-to-video",
    duration_sec: 15,
    resolution: "480p",
    aspect_ratio: "9:16",
    sound: "on",
    style: "auto",
    multiplier: "2.2",
    locale: "ru",
    integrator_request_id: "upstream-1",
    error: "OpenRouter video: output audio may be related to copyright restrictions. Request id: provider-secret-1",
    created_at: new Date("2026-09-11T00:00:00Z"),
    updated_at: new Date("2026-09-11T00:01:00Z"),
  });
  assert.equal(job.error, "Модель отклонила запрос. Попробуйте ещё раз.");
  assert.equal(job.error.includes("OpenRouter"), false);
  assert.equal(job.error.includes("provider-secret-1"), false);
});

test("failed Wan mixed-reference job exposes only the localized compatibility message", () => {
  const job = publicVideoJob({
    id: "job-wan",
    user_id: "user-1",
    conversation_id: "conversation-1",
    status: "failed",
    provider: "alibaba",
    model_id: "wan-3.0",
    model_label: "Wan 3.0",
    prompt: "test",
    mode: "video-to-video",
    duration_sec: 8,
    resolution: "720p",
    aspect_ratio: "16:9",
    sound: "on",
    style: "auto",
    multiplier: "2.2",
    locale: "ru",
    integrator_request_id: "upstream-wan",
    error: 'model "/wan-3.0" does not accept video input references',
    created_at: new Date("2026-09-13T00:00:00Z"),
    updated_at: new Date("2026-09-13T00:01:00Z"),
  });
  assert.equal(job.errorCode, "video_reference_unsupported");
  assert.equal(job.error, "Выбранная модель не поддерживает этот тип референса. Выберите другую модель.");
  assert.equal(job.error.includes("/wan-3.0"), false);
});
