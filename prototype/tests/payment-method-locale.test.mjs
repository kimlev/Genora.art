import assert from "node:assert/strict";
import test from "node:test";

import { effectiveMethodCountries, localeOfCountry, methodVisibleForLocale } from "../src/lib/payments/method-locale.ts";

test("Russia is Russian, the United States is English", () => {
  assert.equal(localeOfCountry("RU"), "ru");
  assert.equal(localeOfCountry("us"), "en");
  assert.equal(localeOfCountry("KZ"), null);
  assert.equal(localeOfCountry("CN"), "en");
  assert.equal(localeOfCountry("JP"), "en");
});

test("a worldwide method is visible on every language", () => {
  assert.equal(methodVisibleForLocale([], "en"), true);
  assert.equal(methodVisibleForLocale([], "ru"), true);
  assert.equal(methodVisibleForLocale([], "zh"), true);
});

test("SBP for Russia is hidden when the interface is not Russian", () => {
  assert.equal(methodVisibleForLocale(["RU"], "ru"), true);
  assert.equal(methodVisibleForLocale(["RU"], "en"), false);
  assert.equal(methodVisibleForLocale(["RU"], "zh"), false);
});

test("a method without its own countries follows the provider", () => {
  assert.deepEqual(effectiveMethodCountries([], ["RU"]), ["RU"]);
  assert.deepEqual(effectiveMethodCountries(["RU"], ["RU", "BY"]), ["RU"]);
  assert.deepEqual(effectiveMethodCountries([], []), []);
  assert.equal(methodVisibleForLocale(effectiveMethodCountries([], ["RU"]), "en"), false);
  assert.equal(methodVisibleForLocale(effectiveMethodCountries([], ["RU"]), "ru"), true);
});
