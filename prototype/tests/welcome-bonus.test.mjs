import assert from "node:assert/strict";
import test from "node:test";

import { agentLaunchHref } from "../src/lib/agent-context.ts";
import { AGENT_ARCHITECT_SYSTEM_PROMPT, buildArchitectUserMessage, extractGeneratedSystemPrompt } from "../src/lib/agent-prompt-templates.ts";
import { alreadyCountedLoginDay, DEFAULT_WELCOME_BONUS_CONFIG, formatWelcomeTokens, nextLoginDays, parseWelcomeBonusConfig, taskEarnedTokens, welcomeBonusCreditAt, welcomeBonusTotal } from "../src/lib/welcome-bonus.ts";

test("welcome bonus math uses the task maximum only when it is finished", () => {
  assert.equal(welcomeBonusTotal(DEFAULT_WELCOME_BONUS_CONFIG), 100_000);
  assert.equal(taskEarnedTokens({ maxBonus: 10_000, required: 20 }, 10), 5_000);
  assert.equal(taskEarnedTokens({ maxBonus: 10_000, required: 20 }, 20), 10_000);
  assert.equal(parseWelcomeBonusConfig({ login: { maxBonus: 1, required: 0 } }), null);
  assert.equal(formatWelcomeTokens(0, "ru"), "+0\u00a0★");
  assert.equal(formatWelcomeTokens(500, "ru"), "+0,5\u00a0★");
  assert.equal(formatWelcomeTokens(1000, "ru"), "+1\u00a0★");
  assert.equal(welcomeBonusCreditAt("2026-08-23T10:00:00.000Z").slice(0, 10), "2026-08-29");
});

test("login days stay consecutive and reset after a gap", () => {
  assert.deepEqual(nextLoginDays([], null, "2026-08-23", 5), ["2026-08-23"]);
  assert.deepEqual(nextLoginDays(["2026-08-23"], "2026-08-23", "2026-08-23", 5), null);
  assert.deepEqual(nextLoginDays(["2026-08-23"], "2026-08-23", "2026-08-24", 5), ["2026-08-23", "2026-08-24"]);
  assert.deepEqual(nextLoginDays(["2026-08-23", "2026-08-24"], "2026-08-24", "2026-08-26", 5), ["2026-08-26"]);
});

test("повторный вход в тот же день не считается новым днём", () => {
  assert.equal(alreadyCountedLoginDay(["2026-08-24"], "2026-08-24", "2026-08-24"), true);
  assert.equal(alreadyCountedLoginDay(["2026-08-24"], null, "2026-08-24"), true);
  assert.equal(alreadyCountedLoginDay(["2026-08-23"], "2026-08-23", "2026-08-24"), false);
  assert.equal(nextLoginDays(["2026-08-24"], null, "2026-08-24", 5), null);
  assert.equal(nextLoginDays(["2026-08-24"], "2026-08-23", "2026-08-24", 5), null);
  assert.equal(nextLoginDays(["2026-08-24", "2026-08-24"], "2026-08-24", "2026-08-24", 5), null);
});

test("agent launch opens images only for image context", () => {
  assert.equal(agentLaunchHref("logo-generator", "images"), "/create-foto-video?agent=logo-generator");
  assert.equal(agentLaunchHref("angel", "video"), "/create-foto-video?tab=video&videoAgent=angel");
  assert.equal(agentLaunchHref("ads-brief", "marketing"), "/chat");
  assert.equal(agentLaunchHref("sql-helper", "code"), "/chat");
});

test("architect help prompt substitutes context and user text", () => {
  assert.match(AGENT_ARCHITECT_SYSTEM_PROMPT, /профессиональный конструктор системных настроек/i);
  assert.match(AGENT_ARCHITECT_SYSTEM_PROMPT, /не более трёх уточняющих вопросов/i);
  assert.match(AGENT_ARCHITECT_SYSTEM_PROMPT, /блоке кода/i);
  const message = buildArchitectUserMessage("изображения", "создатель фотографий", "ru");
  assert.match(message, /Сфера: изображения/);
  assert.match(message, /Роль: создатель фотографий/);
  assert.equal(extractGeneratedSystemPrompt("```markdown\n# ROLE\nФотограф\n```"), "# ROLE\nФотограф");
});
