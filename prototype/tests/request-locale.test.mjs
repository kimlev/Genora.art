import assert from "node:assert/strict";
import test from "node:test";

import { resolveRequestLocale } from "../src/lib/locale-from-request.ts";

test("explicit locale takes priority over Accept-Language", () => {
  assert.equal(resolveRequestLocale({ explicit: "es", acceptLanguage: "fr-FR,fr;q=0.9" }), "es");
});

test("regional Spanish Accept-Language resolves to Spanish", () => {
  assert.equal(resolveRequestLocale({ acceptLanguage: "es-MX,es;q=0.9" }), "es");
});

test("locale cookie takes priority over browser language", () => {
  assert.equal(resolveRequestLocale({ cookie: "fr", acceptLanguage: "es-ES,es;q=0.9" }), "fr");
});

test("unknown locale falls back to Russian", () => {
  assert.equal(resolveRequestLocale({ explicit: "xx", acceptLanguage: "xx-YY" }), "ru");
});

test("retired languages are no longer served", () => {
  assert.equal(resolveRequestLocale({ explicit: "zh", cookie: "ja", acceptLanguage: "ko,nl;q=0.8" }), "ru");
  assert.equal(resolveRequestLocale({ cookie: "el", acceptLanguage: "ro" }), "ru");
});
