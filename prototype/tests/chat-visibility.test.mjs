import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("deleted chats are hidden persistently while messages and usage logs remain", async () => {
  const migration = await readFile(new URL("../db/migrations/069_chat_visibility.sql", import.meta.url), "utf8");
  const workspaceRoute = await readFile(new URL("../src/app/api/workspace/route.ts", import.meta.url), "utf8");
  const jobs = await readFile(new URL("../src/lib/server/generation-jobs.ts", import.meta.url), "utf8");
  const provider = await readFile(new URL("../src/components/providers/workspace-provider.tsx", import.meta.url), "utf8");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS hidden_at/);
  assert.match(workspaceRoute, /FROM conversations WHERE user_id = \$1 AND hidden_at IS NULL/);
  assert.match(workspaceRoute, /UPDATE conversations SET hidden_at=COALESCE\(hidden_at,now\(\)\)/);
  assert.match(workspaceRoute, /UPDATE usage_entries SET deleted=true/);
  assert.doesNotMatch(workspaceRoute, /DELETE FROM conversations c\s+WHERE c\.user_id = \$1 AND NOT/);
  assert.match(jobs, /g\.kind<>'chat' OR c\.hidden_at IS NULL/);
  assert.match(provider, /method: "DELETE"/);
  assert.match(provider, /removePendingChat\(user\.id, id\)/);
});
