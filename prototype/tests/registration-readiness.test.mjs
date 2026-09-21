import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("registration submit stays actionable and validates fields explicitly", async () => {
  const source = await readFile(new URL("../src/components/auth/auth-form.tsx", import.meta.url), "utf8");
  assert.match(source, /const passwordValid = passwordValue\.length >= 8 && passwordValue\.length <= 128/);
  assert.match(source, /const passwordsMatch = passwordValid && passwordValue === confirmPasswordValue/);
  assert.match(source, /minLength=\{8\}/);
  assert.doesNotMatch(source, /isRegister && !registrationReady/);
  assert.match(source, /disabled=\{submitting \|\| !turnstileToken\}/);
  assert.match(source, /value=\{confirmPasswordValue\}/);
});

test("Turnstile stays hidden unless Cloudflare requires interaction", async () => {
  const source = await readFile(new URL("../src/components/security/turnstile.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("../src/lib/server/turnstile.ts", import.meta.url), "utf8");
  assert.match(source, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(source, /appearance: "interaction-only"/);
  assert.match(server, /NEXT_PUBLIC_STAGING === "1" && !secret/);
});
