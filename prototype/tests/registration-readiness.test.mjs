import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("registration submit requires valid email, valid matching passwords and both consents", async () => {
  const source = await readFile(new URL("../src/components/auth/auth-form.tsx", import.meta.url), "utf8");
  assert.match(source, /const emailValid = \/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
  assert.match(source, /const passwordValid = passwordValue\.length >= 8 && passwordValue\.length <= 128/);
  assert.match(source, /const passwordsMatch = passwordValid && passwordValue === confirmPasswordValue/);
  assert.match(source, /const registrationReady = emailValid && passwordsMatch && termsAccepted && privacyAccepted/);
  assert.match(source, /isRegister && !registrationReady/);
  assert.match(source, /value=\{confirmPasswordValue\}/);
});
