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
