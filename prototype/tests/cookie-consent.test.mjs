import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  GOOGLE_CONSENT_BOOTSTRAP,
  consentCookie,
  cookieConsentFromHeader,
  googleConsentSignals,
  parseCookieConsent,
} from "../src/lib/cookie-consent.ts";

test("Consent Mode v2 denies all optional storage before a choice", () => {
  for (const signal of ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(GOOGLE_CONSENT_BOOTSTRAP, new RegExp(`${signal}:'denied'`));
  }
  assert.match(GOOGLE_CONSENT_BOOTSTRAP, /gtag\('set','ads_data_redaction',true\)/);
  assert.match(GOOGLE_CONSENT_BOOTSTRAP, /gtag\('set','url_passthrough',true\)/);
  assert.match(GOOGLE_CONSENT_BOOTSTRAP, /document\.cookie/);
});

test("Google tag follows the client-side consent flow on every shell", async () => {
  const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /!isAdminHost\s*\?/);
  const analytics = await readFile(new URL("../src/components/analytics/google-analytics.tsx", import.meta.url), "utf8");
  assert.match(analytics, /googletagmanager\.com\/gtag\/js\?id=\$\{MEASUREMENT_ID\}/);
  assert.match(analytics, /send_page_view:false/);
  assert.match(analytics, /IS_STAGING \|\| !analyticsGranted/);
  assert.match(analytics, /cookieConsentFromHeader\(document\.cookie\)/);
  const shell = await readFile(new URL("../src/components/layout/site-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /if \(isAdminHost \|\| isAdminPage\)[\s\S]*?<GoogleAnalytics \/>/);
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

test("consent cookie is shared by Genora subdomains", () => {
  const value = { version: 2, analytics: false, advertising: false };
  const cookie = consentCookie(value, "dev.admin.genora.art");
  assert.match(cookie, /Domain=\.genora\.art/);
  assert.deepEqual(parseCookieConsent(cookieConsentFromHeader(cookie)), value);
});

test("banner offers accept, reject, customize and later reopening", async () => {
  const banner = await readFile(new URL("../src/components/legal/cookie-consent.tsx", import.meta.url), "utf8");
  const footer = await readFile(new URL("../src/components/layout/site-footer.tsx", import.meta.url), "utf8");
  assert.match(banner, /t\.legal\.consent\.reject/);
  assert.match(banner, /copy\.customize/);
  assert.match(banner, /onClick=\{\(\) => setCustomizing\(true\)\}/);
  assert.match(banner, /onClick=\{\(\) => closeAfterSave\(draft\)\}/);
  assert.match(banner, /setJustSaved\(saveConsent\(value\)\)/);
  assert.match(banner, /href=\{`\$\{SITE_ORIGIN\}\/\$\{locale\}\/legal\/cookies`\}/);
  assert.match(banner, /t\.legal\.consent\.accept/);
  assert.match(banner, /copy\.essential/);
  assert.doesNotMatch(banner, /aria-label="Close"/);
  assert.match(footer, /CONSENT_OPEN_EVENT/);
});
