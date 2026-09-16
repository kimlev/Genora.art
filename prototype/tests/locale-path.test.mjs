import assert from "node:assert/strict";
import test from "node:test";

import {
  isUnlocalizedPath,
  localizeHref,
  splitLocalePath,
  splitRetiredLocalePath,
  withLocalePath,
} from "../src/lib/i18n/locale-path.ts";
import { localeOptions } from "../src/lib/i18n/index.ts";

test("splits a language prefix from the rest of the path", () => {
  assert.deepEqual(splitLocalePath("/en/chat"), { locale: "en", path: "/chat" });
  assert.deepEqual(splitLocalePath("/ru"), { locale: "ru", path: "/" });
  assert.deepEqual(splitLocalePath("/es/blog/some-article"), { locale: "es", path: "/blog/some-article" });
});

test("keeps paths without a language prefix untouched", () => {
  assert.deepEqual(splitLocalePath("/"), { locale: null, path: "/" });
  assert.deepEqual(splitLocalePath("/pricing"), { locale: null, path: "/pricing" });
  assert.deepEqual(splitLocalePath("/rating"), { locale: null, path: "/rating" });
});

test("drops a trailing slash so route comparisons stay stable", () => {
  assert.deepEqual(splitLocalePath("/de/pricing/"), { locale: "de", path: "/pricing" });
});

test("adds a language prefix and replaces an existing one", () => {
  assert.equal(withLocalePath("/pricing", "en"), "/en/pricing");
  assert.equal(withLocalePath("/en/pricing", "fr"), "/fr/pricing");
  assert.equal(withLocalePath("/", "ja"), "/ja");
  assert.equal(withLocalePath("/ru", "ar"), "/ar");
});

test("links inside the site get the current language, keeping query and hash", () => {
  assert.equal(localizeHref("/support", "en"), "/en/support");
  assert.equal(localizeHref("/images?agent=logo", "de"), "/de/images?agent=logo");
  assert.equal(localizeHref("/pricing#plans", "it"), "/it/pricing#plans");
  assert.equal(localizeHref("/", "ko"), "/ko");
});

test("links that must not change language stay as written", () => {
  assert.equal(localizeHref("/en/support", "ru"), "/en/support");
  assert.equal(localizeHref("/api/auth/google/start", "fr"), "/api/auth/google/start");
  assert.equal(localizeHref("/admin/login", "es"), "/admin/login");
  assert.equal(localizeHref("https://genora.art/pricing", "pl"), "https://genora.art/pricing");
  assert.equal(localizeHref("//example.com/x", "pt"), "//example.com/x");
  assert.equal(localizeHref("#features", "nl"), "#features");
});

test("retired language prefixes are stripped so they can be redirected", () => {
  assert.deepEqual(splitRetiredLocalePath("/zh/models"), { path: "/models" });
  assert.deepEqual(splitRetiredLocalePath("/ja"), { path: "/" });
  assert.equal(splitRetiredLocalePath("/en/chat"), null);
  assert.equal(splitLocalePath("/zh/models").locale, null);
});

test("the language menu lists only served languages", () => {
  assert.deepEqual(localeOptions.map((option) => option.code), [
    "en", "hi", "es", "fr", "ar", "pt", "ru", "de", "it", "tr", "pl", "sv", "cs",
  ]);
});

test("api, admin and integration paths stay without a language prefix", () => {
  assert.equal(isUnlocalizedPath("/api/support"), true);
  assert.equal(isUnlocalizedPath("/admin"), true);
  assert.equal(isUnlocalizedPath("/admin/login"), true);
  assert.equal(isUnlocalizedPath("/blogoro/publish"), true);
  assert.equal(isUnlocalizedPath("/pricing"), false);
  assert.equal(isUnlocalizedPath("/en/pricing"), false);
});
