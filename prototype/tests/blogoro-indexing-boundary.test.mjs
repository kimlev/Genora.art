import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const source = (file) => readFileSync(path.join(root, file), "utf8");

test("Blogoro publishes both article kinds on dev without search submission", () => {
  const receiver = source("src/app/blogoro/publish/route.ts");
  assert.match(receiver, /publishBlogoroPageSection\(/);
  assert.match(receiver, /publishBlogoroArticle\(/);
  assert.match(receiver, /revalidatePath\("\/sitemap\.xml"\)/);
  assert.match(receiver, /IS_STAGING\s*\?\s*\[\]\s*:\s*await submitPageForIndexing\(/);
  assert.match(receiver, /sitemap: publicSiteUrl\("\/sitemap\.xml"\)/);
});

test("all outbound indexing channels and manual admin submission are disabled on dev", () => {
  assert.match(source("src/lib/server/search-submit.ts"), /if \(IS_STAGING\) return \[\]/);
  assert.match(source("src/lib/server/indexnow.ts"), /if \(IS_STAGING\) return \{ submitted: 0, status: null, reason: "disabled-on-dev" \}/);
  assert.match(source("src/lib/server/search-console.ts"), /if \(IS_STAGING\) throw new Error\("Отправка карты сайта в Google отключена на dev"\)/);
  assert.match(source("src/lib/server/yandex-webmaster.ts"), /if \(IS_STAGING\) throw new Error\("Отправка страниц в Яндекс отключена на dev"\)/);
  assert.match(source("src/app/api/admin/seo/route.ts"), /if \(IS_STAGING\) return jsonError\("Отправка адресов в поисковые системы доступна только на production",403\)/);
});

test("published Blogoro slugs render dynamically after deployment", () => {
  const articlePage = source("src/app/[locale]/blog/[slug]/page.tsx");
  assert.match(articlePage, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(articlePage, /generateStaticParams/);
});
