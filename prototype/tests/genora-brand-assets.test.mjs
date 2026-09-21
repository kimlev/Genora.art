import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";

const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const manifest = await readFile(new URL("../src/app/manifest.ts", import.meta.url), "utf8");
const bimi = await readFile(new URL("../public/bimi/logo.svg", import.meta.url), "utf8");
const productionNginx = await readFile(new URL("../../infra/production/nginx-prod-hosts.conf", import.meta.url), "utf8");

test("publishes stable crawler-readable favicon and application icons", async () => {
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /url: "\/favicon\.ico"/);
  assert.match(layout, /icon-48\.png/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(manifest, /theme_color: "#FF6F00"/);
  for (const file of ["favicon.ico", "favicon/icon-48.png", "favicon/icon-192.png", "favicon/icon-512.png"]) {
    assert.ok((await stat(new URL(`../public/${file}`, import.meta.url))).size > 0);
  }
});

test("BIMI asset uses the Genora palette and the portable secure profile", () => {
  assert.match(bimi, /baseProfile="tiny-ps"/);
  assert.match(bimi, /<desc>Genora\.art orange spiral mark<\/desc>/);
  assert.match(bimi, /#FF6F00/);
  assert.doesNotMatch(bimi, /#4A9EFF/);
});

test("production public host serves its own app without the temporary dev redirect", () => {
  assert.doesNotMatch(productionNginx, /genora-public-temporary-redirect\.conf/);
  assert.match(productionNginx, /server_name genora\.art www\.genora\.art server1\.genora\.art;/);
});
