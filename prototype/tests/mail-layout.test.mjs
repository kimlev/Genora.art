import assert from "node:assert/strict";
import test from "node:test";

import { authMailLocales, getAuthMailCopy } from "../src/lib/mail-auth-copy.ts";
import { getMailCopy } from "../src/lib/mail-copy.ts";
import { mailDirection, renderActionEmailHtml } from "../src/lib/mail-layout.ts";

const mailLocales = ["en", "ru", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"];
const supportTopics = ["cooperation", "billing-refund", "other", "inbound-email"];

test("verification and password-reset copy exist for every app language", () => {
  const locales = authMailLocales();
  assert.equal(locales.length, 19);
  for (const locale of locales) {
    const copy = getAuthMailCopy(locale);
    assert.ok(copy.verification.subject.includes("Genora.art"));
    assert.ok(copy.reset.subject.includes("Genora.art"));
    assert.ok(copy.verification.title.length > 2);
    assert.ok(copy.reset.title.length > 2);
    assert.ok(copy.verification.button.length > 2);
    assert.ok(copy.reset.button.length > 2);
    assert.match(copy.verification.text("https://example.test"), /https:\/\/example\.test/);
    assert.match(copy.reset.text("https://example.test"), /https:\/\/example\.test/);
  }
});

test("Spanish verification copy is actually localized", () => {
  const copy = getAuthMailCopy("es").verification;
  assert.equal(copy.subject, "Confirma tu registro en Genora.art");
  assert.equal(copy.title, "Confirma tu correo");
  assert.equal(copy.button, "Confirmar registro");
});

test("support topics are localized for every app language", () => {
  const englishTopics = getMailCopy("en").topics;
  assert.equal(mailLocales.length, 19);

  for (const locale of mailLocales) {
    const topics = getMailCopy(locale).topics;
    for (const topic of supportTopics) {
      assert.ok(topics[topic]?.length > 1, `${locale}.${topic} is missing`);
      if (locale !== "en") {
        assert.notEqual(topics[topic], englishTopics[topic], `${locale}.${topic} still uses English`);
      }
    }
  }
});

test("Spanish support topics, subjects, and sign-off are localized", () => {
  const english = getMailCopy("en");
  const spanish = getMailCopy("es");

  assert.deepEqual(spanish.topics, {
    cooperation: "Colaboración",
    "billing-refund": "Facturación o reembolso",
    other: "Otro asunto",
    "inbound-email": "Consulta por correo electrónico",
  });
  assert.notEqual(spanish.supportReceiptSubject("SUP-1"), english.supportReceiptSubject("SUP-1"));
  assert.notEqual(spanish.supportReplySubject("SUP-1"), english.supportReplySubject("SUP-1"));
  assert.notEqual(spanish.supportSignOff, english.supportSignOff);
});

test("action emails are table-based and keep the logo, button, and fallback link", () => {
  const copy = getAuthMailCopy("ja").verification;
  const html = renderActionEmailHtml({ locale: "ja", url: "https://genora.art/verify-email#token", ...copy });
  assert.match(html, /<table role="presentation"/);
  assert.match(html, /cid:genora-logo/);
  assert.match(html, /登録を確認/);
  assert.match(html, /https:\/\/genora\.art\/verify-email#token/);
  assert.equal(mailDirection("ar"), "rtl");
  assert.match(renderActionEmailHtml({ locale: "ar", url: "https://example.test", ...getAuthMailCopy("ar").reset }), /dir="rtl"/);
});

test("action email button is centered and fallback text stays below it", () => {
  const html = renderActionEmailHtml({ locale: "ru", url: "https://dev.genora.art/ru/verify-email#token", ...getAuthMailCopy("ru").verification });
  const buttonIndex = html.indexOf("Подтвердить регистрацию");
  const fallbackIndex = html.indexOf("Если кнопка не открывается");
  assert.notEqual(buttonIndex, -1);
  assert.notEqual(fallbackIndex, -1);
  assert.ok(buttonIndex < fallbackIndex);
  assert.match(html, /<td align="center" style="padding:0 0 24px;">/);
  assert.doesNotMatch(html, /<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">/);
});
