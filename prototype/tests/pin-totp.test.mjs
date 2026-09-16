import assert from "node:assert/strict";
import test from "node:test";
import { normalizePin } from "../src/lib/pin.ts";
import { generateTotpCode, toBase32, verifyTotpCode } from "../src/lib/totp-core.ts";

test("accepts a 4-digit PIN and rejects anything else", () => {
  assert.equal(normalizePin("1234"), "1234");
  assert.equal(normalizePin("12 34"), "1234");
  assert.equal(normalizePin("12a4"), null);
  assert.equal(normalizePin("123"), null);
  assert.equal(normalizePin("12345"), null);
});

test("verifies a TOTP code for the current 30-second window", () => {
  const secret = toBase32(Buffer.from("12345678901234567890"));
  const timestamp = 1_111_111_110_000;
  const code = generateTotpCode(secret, timestamp);
  assert.equal(code.length, 6);
  assert.equal(verifyTotpCode(secret, code, timestamp), true);
  assert.equal(verifyTotpCode(secret, code, timestamp + 30_000), true);
  assert.equal(verifyTotpCode(secret, "000000", timestamp), false);
});
