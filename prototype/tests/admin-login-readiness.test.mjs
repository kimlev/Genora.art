import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isAdminHostname, requestHostname } from "../src/lib/admin-host.ts";

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

test("dedicated admin hosts render without the client site shell", async () => {
  const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/components/layout/site-shell.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/components/admin/admin-dashboard.tsx", import.meta.url), "utf8");
  assert.equal(requestHostname("dev.admin.genora.art:443"), "dev.admin.genora.art");
  assert.equal(requestHostname("dev.admin.genora.art, proxy.internal"), "dev.admin.genora.art");
  assert.equal(isAdminHostname("dev.admin.genora.art"), true);
  assert.equal(isAdminHostname("admin.genora.art"), true);
  assert.equal(isAdminHostname("dev.genora.art"), false);
  assert.match(layout, /<SiteShell isAdminHost=\{isAdminHost\}>/);
  assert.match(shell, /if \(isAdminHost \|\| isAdminPage\)/);
  assert.match(dashboard, /id==="overview" \? "\/" : `\/\?section=\$\{id\}`/);
  assert.doesNotMatch(dashboard, /id==="overview" \? "\/admin"/);
});
