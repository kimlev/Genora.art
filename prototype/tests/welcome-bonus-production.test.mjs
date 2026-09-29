import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("welcome bonus is available in production as well as dev", async () => {
  const [server, card, adminSettings] = await Promise.all([
    readFile(new URL("../src/lib/server/welcome-bonus.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/layout/welcome-bonus-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/admin/admin-settings.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(server, /IS_STAGING/);
  assert.doesNotMatch(card, /IS_STAGING/);
  assert.doesNotMatch(adminSettings, /IS_STAGING/);
  assert.match(adminSettings, /<WelcomeBonusSettings \/>/);
  assert.match(server, /startWelcomeBonusCampaign/);
  assert.match(card, /WelcomeBonusProgress/);
});
