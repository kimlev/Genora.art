import assert from "node:assert/strict";
import test from "node:test";

import {
  HEAVY_CHAT_SLOTS,
  INTEGRATOR_CHAT_SLOTS,
  VIDEO_CHAT_SLOTS,
  EXTENDED_CHAT_TIMEOUT_MS,
  LONG_CHAT_TIMEOUT_MS,
  LONG_OUTPUT_TOKENS,
  NORMAL_CHAT_TIMEOUT_MS,
  chatAttemptTimeoutMs,
  chatOutputTokenLimit,
  chatModelShowsDepthPicker,
  clampChatDepthForModel,
  isGemmaChatModel,
  isGpt55ChatModel,
  isGpt55FamilyModel,
  isGpt55ProModel,
  isHeavyChatRequest,
  shouldFallbackChat,
} from "../src/lib/chat-request-policy.ts";
import { SlotGate } from "../src/lib/request-slots.ts";

test("Pro и глубокий режим считаются тяжёлыми", () => {
  assert.equal(isHeavyChatRequest("gpt-5.5-pro", "balanced"), true);
  assert.equal(isHeavyChatRequest("gpt-5.5", "deep"), true);
  assert.equal(isHeavyChatRequest("gpt-5.5", "balanced"), false);
  assert.equal(chatAttemptTimeoutMs("gpt-5.5-pro", "deep"), EXTENDED_CHAT_TIMEOUT_MS);
  assert.equal(chatAttemptTimeoutMs("gpt-5.5", "fast"), EXTENDED_CHAT_TIMEOUT_MS);
  assert.equal(chatAttemptTimeoutMs("gpt-5.4", "fast"), LONG_CHAT_TIMEOUT_MS);
  assert.equal(LONG_CHAT_TIMEOUT_MS, 12 * 60_000);
  assert.equal(NORMAL_CHAT_TIMEOUT_MS, 12 * 60_000);
  assert.equal(EXTENDED_CHAT_TIMEOUT_MS, 50 * 60_000);
  assert.equal(chatOutputTokenLimit("gpt-5.5-pro", "balanced"), LONG_OUTPUT_TOKENS);
  assert.equal(chatOutputTokenLimit("gpt-5.5", "fast"), LONG_OUTPUT_TOKENS);
});

test("никакой запрос не уходит на запасную модель", () => {
  const timeout = new Error("The operation was aborted");
  timeout.name = "TimeoutError";
  assert.equal(shouldFallbackChat(new Error("429 Rate limit reached for gpt-5.5-pro")), false);
  assert.equal(shouldFallbackChat(timeout), false);
  assert.equal(shouldFallbackChat(timeout, "auto"), false);
  assert.equal(shouldFallbackChat(timeout, "gpt-5.5-pro"), false);
});

test("четвёртый тяжёлый запрос не занимает слот сразу", () => {
  const heavy = new SlotGate(HEAVY_CHAT_SLOTS);
  const taken = Array.from({ length: 10 }, () => heavy.tryAcquire());
  assert.equal(taken.filter(Boolean).length, HEAVY_CHAT_SLOTS);
  assert.equal(taken.filter((slot) => slot == null).length, 10 - HEAVY_CHAT_SLOTS);
  taken[0]?.();
  assert.ok(heavy.tryAcquire());
});

test("Gemma не показывает глубину и не принимает reasoning", () => {
  assert.equal(isGemmaChatModel("gemma-4-26b-a4b-it"), true);
  assert.equal(isGemmaChatModel("gemma-4-31b-it"), true);
  assert.equal(isGemmaChatModel("gemini-3.5-flash"), false);
  assert.equal(chatModelShowsDepthPicker("gemma-4-26b-a4b-it", { options: [] }), false);
  assert.equal(chatModelShowsDepthPicker("gpt-5.5", { defaultValue: "medium" }), true);
});

test("GPT-5.5 Pro снова может быть средней и глубокой", () => {
  assert.equal(isGpt55ProModel("gpt-5.5-pro"), true);
  assert.equal(isGpt55ChatModel("gpt-5.5"), true);
  assert.equal(isGpt55ChatModel("gpt-5.5-pro"), false);
  assert.equal(isGpt55FamilyModel("gpt-5.5-pro"), true);
  assert.equal(clampChatDepthForModel("gpt-5.5-pro", "deep"), "deep");
  assert.equal(clampChatDepthForModel("gpt-5.5-pro", "balanced"), "balanced");
  assert.equal(clampChatDepthForModel("gpt-5.5", "deep"), "deep");
});

test("обычные ответы не упираются в три слота Pro", () => {
  const all = new SlotGate(INTEGRATOR_CHAT_SLOTS);
  const taken = Array.from({ length: 10 }, () => all.tryAcquire());
  assert.equal(taken.filter(Boolean).length, 10);
});

test("большое видео занимает три слота, лишние ждут освобождения", async () => {
  const video = new SlotGate(VIDEO_CHAT_SLOTS);
  const taken = Array.from({ length: 10 }, () => video.tryAcquire());
  assert.equal(taken.filter(Boolean).length, VIDEO_CHAT_SLOTS);
  const waiting = video.acquire(500);
  await new Promise((resolve) => setTimeout(resolve, 40));
  taken.find(Boolean)?.();
  assert.ok(await waiting);
});
