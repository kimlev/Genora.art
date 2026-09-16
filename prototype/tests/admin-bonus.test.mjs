import assert from "node:assert/strict";
import test from "node:test";

import {
  adminBonusNote,
  adminBonusTokens,
  MAX_ADMIN_BONUS_TOKENS,
  MIN_ADMIN_BONUS_TOKENS,
} from "../src/lib/admin-bonus.ts";
import { formatTokensAsCredits } from "../src/lib/credits.ts";

test("accepts an integer admin bonus from 5 through 1000 display tokens", () => {
  assert.equal(adminBonusTokens(MIN_ADMIN_BONUS_TOKENS), 5_000);
  assert.equal(adminBonusTokens(200), 200_000);
  assert.equal(adminBonusTokens(MAX_ADMIN_BONUS_TOKENS), 1_000_000);
});

test("rejects an out-of-range or non-integer admin bonus", () => {
  assert.equal(adminBonusTokens(4), null);
  assert.equal(adminBonusTokens(1_001), null);
  assert.equal(adminBonusTokens(200.5), null);
  assert.equal(adminBonusTokens("200"), null);
});

test("formats the balance history note as a bonus in display tokens", () => {
  assert.equal(adminBonusNote(25_000), `Бонус — ${formatTokensAsCredits(25_000, "ru", "spend")}`);
});
