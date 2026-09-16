import test from "node:test";
import assert from "node:assert/strict";
import { passwordStrength } from "../src/lib/password-strength.ts";

test("classifies password strength from weak to reliable", () => {
  assert.equal(passwordStrength("abc")?.level, 1);
  assert.equal(passwordStrength("Abcdefg1")?.level, 2);
  assert.equal(passwordStrength("Abcdefgh123!")?.level, 3);
  assert.equal(passwordStrength("Abcdefgh123!xyz")?.level, 4);
  assert.equal(passwordStrength(""), null);
});
