import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const support = await readFile(new URL("../src/components/admin/admin-support.tsx", import.meta.url), "utf8");
const supportRoute = await readFile(new URL("../src/app/api/admin/support/route.ts", import.meta.url), "utf8");
const supportReadMigration = await readFile(new URL("../db/migrations/070_support_admin_read_at.sql", import.meta.url), "utf8");
const devWorkflow = await readFile(new URL("../../.github/workflows/deploy.yml", import.meta.url), "utf8");

test("unread support requests are bold and opening one persists the read state", () => {
  assert.match(support, /item\.readAt \? "font-normal" : "font-semibold"/);
  assert.match(support, /JSON\.stringify\(\{ action: "read", id: item\.id \}\)/);
  assert.match(supportRoute, /SET admin_read_at=COALESCE\(admin_read_at,now\(\)\)/);
  assert.match(supportRoute, /request: await requestDetail\(id\)/);
  assert.match(supportReadMigration, /ADD COLUMN IF NOT EXISTS admin_read_at timestamptz/);
});

test("dev deploy recreates the support worker with the current application image", () => {
  assert.match(devWorkflow, /docker compose up -d --build postgres app support-worker/);
  assert.match(devWorkflow, /docker compose ps/);
});
