import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  GOOGLE_CONSENT_BOOTSTRAP,
  googleConsentSignals,
  parseCookieConsent,
} from "../src/lib/cookie-consent.ts";

test("Consent Mode v2 denies all optional storage before a choice", () => {
  for (const signal of ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(GOOGLE_CONSENT_BOOTSTRAP, new RegExp(`${signal}:'denied'`));
  }
});

test("custom consent maps analytics and advertising independently", () => {
  assert.deepEqual(
    googleConsentSignals({ version: 2, analytics: true, advertising: false }),
    {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  );
});

test("legacy acceptance does not silently grant advertising", () => {
  assert.deepEqual(parseCookieConsent("accepted"), {
    version: 2,
    analytics: true,
    advertising: false,
  });
});

test("banner offers accept, reject, customize and later reopening", async () => {
  const banner = await readFile(new URL("../src/components/legal/cookie-consent.tsx", import.meta.url), "utf8");
  const footer = await readFile(new URL("../src/components/layout/site-footer.tsx", import.meta.url), "utf8");
  assert.match(banner, /t\.legal\.consent\.reject/);
  assert.match(banner, /copy\.customize/);
  assert.match(banner, /onClick=\{\(\) => setCustomizing\(true\)\}/);
  assert.match(banner, /onClick=\{\(\) => closeAfterSave\(draft\)\}/);
  assert.match(banner, /href="\/legal\/privacy"/);
  assert.match(banner, /t\.legal\.consent\.accept/);
  assert.match(banner, /copy\.essential/);
  assert.doesNotMatch(banner, /aria-label="Close"/);
  assert.match(footer, /CONSENT_OPEN_EVENT/);
});
