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

test("dev exposes public pages and sitemap to AI agents without allowing indexing", () => {
  const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
  const sitemap = readFileSync(join(root, "src/app/sitemap.ts"), "utf8");
  assert.match(robots, /userAgent: "\*"/);
  assert.match(robots, /allow: "\/"/);
  assert.doesNotMatch(robots, /userAgent: "\*", disallow: "\/"/);
  assert.match(robots, /"\/blogoro\/publish"/);
  assert.doesNotMatch(sitemap, /if \(IS_STAGING\) return \[\]/);
  assert.match(sitemap, /localeOptions\.map/);
  assert.match(sitemap, /getBlogPosts\(\)/);
  assert.match(sitemap, /\["ru", "en"\]/);
  const legalPage = readFileSync(join(root, "src/app/[locale]/legal/[slug]/page.tsx"), "utf8");
  assert.match(legalPage, /robots: \{ index: !IS_STAGING, follow: !IS_STAGING \}/);
});
