import assert from "node:assert/strict";
import test from "node:test";

import { rankChatRoutes, requestedChatDepth } from "@/lib/chat-auto-route";

const candidate = (overrides) => ({
  id: "model",
  providerId: "provider",
  score: 1500,
  inputPrice: 1,
  outputPrice: 3,
  latencyMs: 5_000,
  supportsReasoning: true,
  ...overrides,
});

test("запрос определяет автоматическую глубину до выбора модели", () => {
  assert.equal(requestedChatDepth("Привет", "auto", "ru"), "fast");
  assert.equal(requestedChatDepth("Разберись, почему архитектура не работает", "auto", "ru"), "deep");
});

test("один пул выбирает разные модель и провайдера для простого и сложного запроса", () => {
  const candidates = [
    candidate({ id: "quick", providerId: "quick-provider", score: 1300, inputPrice: 0.5, outputPrice: 1, latencyMs: 1_000, supportsReasoning: false }),
    candidate({ id: "strong", providerId: "strong-provider", score: 1950, inputPrice: 5, outputPrice: 25, latencyMs: 12_000, supportsReasoning: true }),
  ];
  assert.equal(rankChatRoutes(candidates, "fast")[0].id, "quick");
  assert.equal(rankChatRoutes(candidates, "fast")[0].providerId, "quick-provider");
  assert.equal(rankChatRoutes(candidates, "deep")[0].id, "strong");
  assert.equal(rankChatRoutes(candidates, "deep")[0].providerId, "strong-provider");
});

test("неполная метрика не удаляет модель из маршрутизации", () => {
  const ranked = rankChatRoutes([
    candidate({ id: "complete" }),
    candidate({ id: "temporarily-incomplete", inputPrice: 0, outputPrice: 0, latencyMs: 0 }),
  ], "balanced");
  assert.deepEqual(new Set(ranked.map((item) => item.id)), new Set(["complete", "temporarily-incomplete"]));
});
