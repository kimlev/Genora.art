import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("generation balance snapshots trigger a fresh read, never overwrite the displayed wallet", async () => {
  const source = await readFile(new URL("../src/components/providers/auth-provider.tsx", import.meta.url), "utf8");
  const setter = source.slice(source.indexOf("const setBalanceTokens ="), source.indexOf("const value = useMemo"));
  assert.match(setter, /genora-balance-changed/);
  assert.doesNotMatch(setter, /setUser\(/);
  assert.match(source, /version === walletRefreshRef.current/);
  assert.match(source, /current.id === wallet.id/);
});
