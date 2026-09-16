import assert from "node:assert/strict";
import test from "node:test";

import { integratorProviderId } from "../src/lib/provider-id.ts";

test("maps Google Gemini and Lyria labels to integrator google id", () => {
  assert.equal(integratorProviderId("Google Gemini"), "google");
  assert.equal(integratorProviderId("Google Lyria"), "google");
  assert.equal(integratorProviderId("Google"), "google");
  assert.equal(integratorProviderId("google"), "google");
});

test("prefers catalog id when the picker shows a branded label", () => {
  const catalog = [{ id: "google", name: "Google Gemini" }];
  assert.equal(integratorProviderId("Google Gemini", catalog), "google");
  assert.equal(integratorProviderId("Kimi (Moonshot)"), "kimi");
  assert.equal(integratorProviderId("Alibaba Qwen"), "alibaba");
  assert.equal(integratorProviderId("OpenAI"), "openai");
});
