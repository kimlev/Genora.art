import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("robots.ts не содержит устаревшую директиву Host", () => {
  const source = readFileSync(join(root, "src/app/robots.ts"), "utf8");
  assert.equal(/\bhost\s*:/.test(source), false);
  assert.match(source, /sitemap:\s*publicSiteUrl\("\/sitemap\.xml"\)/);
  assert.match(source, /allow:\s*"\/"/);
  assert.match(source, /\/profile/);
  assert.match(source, /\/api\//);
});
