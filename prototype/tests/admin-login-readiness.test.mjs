import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("admin host is accepted and login uses the Genora password controls", async () => {
  const http = await readFile(new URL("../src/lib/server/http.ts", import.meta.url), "utf8");
  const form = await readFile(new URL("../src/components/admin/admin-login-form.tsx", import.meta.url), "utf8");
  assert.match(http, /process\.env\.ADMIN_PUBLIC_ORIGIN/);
  assert.doesNotMatch(form, /Dev environment/i);
  assert.doesNotMatch(form, /ShieldCheck/);
  assert.match(form, /showPassword\?"text":"password"/);
  assert.match(form, /Показать пароль/);
  assert.match(form, /Скрыть пароль/);
});
