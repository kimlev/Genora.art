import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_REGISTRATION_BONUS_THOUSANDS,
  MAX_REGISTRATION_BONUS_THOUSANDS,
  MIN_REGISTRATION_BONUS_THOUSANDS,
  parseRegistrationBonusThousands,
  registrationBonusTokensFromThousands,
} from "../src/lib/site-settings.ts";

test("accepts an integer registration bonus in thousands", () => {
  assert.equal(parseRegistrationBonusThousands(20), 20);
  assert.equal(parseRegistrationBonusThousands("20"), 20);
  assert.equal(parseRegistrationBonusThousands(MIN_REGISTRATION_BONUS_THOUSANDS), 1);
  assert.equal(parseRegistrationBonusThousands(MAX_REGISTRATION_BONUS_THOUSANDS), 500);
  assert.equal(registrationBonusTokensFromThousands(DEFAULT_REGISTRATION_BONUS_THOUSANDS), 20_000);
});

test("rejects an out-of-range or non-integer registration bonus", () => {
  assert.equal(parseRegistrationBonusThousands(0), null);
  assert.equal(parseRegistrationBonusThousands(501), null);
  assert.equal(parseRegistrationBonusThousands(20.5), null);
  assert.equal(parseRegistrationBonusThousands("20.0"), null);
  assert.equal(parseRegistrationBonusThousands("abc"), null);
});
