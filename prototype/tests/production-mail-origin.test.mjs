import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("user mail links use the configured app origin only", async () => {
  const [register, forgot, origins] = await Promise.all([
    readFile(new URL("../src/app/api/auth/register/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/auth/forgot-password/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/server/public-origins.ts", import.meta.url), "utf8"),
  ]);
  assert.match(register, /publicAppOrigin\(\)/);
  assert.match(forgot, /publicAppOrigin\(\)/);
  assert.match(origins, /process\.env\.APP_BASE_URL/);
  assert.doesNotMatch(register, /new URL\(request\.url\)\.origin/);
  assert.doesNotMatch(forgot, /new URL\(request\.url\)\.origin/);
});

test("admin links use ADMIN_PUBLIC_ORIGIN and never the request host", async () => {
  const [invitations, youtube, origins] = await Promise.all([
    readFile(new URL("../src/app/api/admin/invitations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/admin/youtube/oauth/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/server/public-origins.ts", import.meta.url), "utf8"),
  ]);
  assert.match(invitations, /publicAdminOrigin\(\)/);
  assert.match(youtube, /publicAdminOrigin\(\)/);
  assert.match(origins, /process\.env\.ADMIN_PUBLIC_ORIGIN/);
  assert.doesNotMatch(invitations, /new URL\(request\.url\)\.origin/);
  assert.doesNotMatch(youtube, /new URL\(request\.url\)\.origin/);
});
