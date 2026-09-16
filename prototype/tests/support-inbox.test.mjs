import assert from "node:assert/strict";
import test from "node:test";

import { formatStoredEmail, linkifyBareUrls, renderEmailHtml } from "../src/lib/email-html.ts";
import { applyPublicContactEmail, DEFAULT_PUBLIC_EMAIL } from "../src/lib/public-contact.ts";
import { isCheapTranslationModelId, isTextChatModelId, looksLikeRussian, pickCheapestTextModel, sourceTextForTranslation, TRANSLATION_PROMPT, translationUsageTitle } from "../src/lib/support-translation.ts";

test("translation picker skips video and minimax ids that look like mini", () => {
  assert.equal(isCheapTranslationModelId("video:minimax:hailuo-3"), false);
  assert.equal(isCheapTranslationModelId("video:bytedance:seedance-2.0-mini"), false);
  assert.equal(isCheapTranslationModelId("video:google:omni-1.1-flash"), false);
  assert.equal(isTextChatModelId("minimax-m3"), true);
  assert.equal(isCheapTranslationModelId("minimax-m3"), false);
  assert.equal(isCheapTranslationModelId("deepseek-v4-flash-0731"), true);
  assert.equal(isCheapTranslationModelId("gpt-4o-mini"), true);
});
import { parseAcceptLanguage, resolveRequestLocale } from "../src/lib/locale-from-request.ts";
import { getMailCopy } from "../src/lib/mail-copy.ts";
import { supportMailProvider, SUPPORT_MAIL_PROVIDERS } from "../src/lib/support-mail-providers.ts";
import {
  brandFolderName,
  isAutomatedMail,
  isCorporateSender,
  isCustomerInquiry,
  senderFolderName,
  shouldAutoReply,
  shouldRunDailyOrganize,
} from "../src/lib/support-policy.ts";

test("lists only integrated mailbox providers", () => {
  assert.equal(SUPPORT_MAIL_PROVIDERS.length, 1);
  assert.equal(supportMailProvider("privateemail")?.host, "mail.privateemail.com");
  assert.equal(supportMailProvider("gmail"), null);
});

test("never treats corporate senders as clients", () => {
  assert.equal(isCorporateSender("Kim <support@genora.art>"), true);
  assert.equal(isCorporateSender("ops@genora.art"), true);
  assert.equal(shouldAutoReply({
    channel: "email",
    from: "finance@genora.art",
    subject: "Need help with billing?",
    text: "Please help, the invoice is wrong",
  }), false);
});

test("does not reply to automated or non-inquiry mail", () => {
  assert.equal(isAutomatedMail({ from: "noreply@vendor.com", subject: "Newsletter" }), true);
  assert.equal(isAutomatedMail({ from: "dont-reply@freemius.com", subject: "New Token Top Up" }), true);
  assert.equal(isAutomatedMail({ from: "pay@freemius.com", subject: "Please do not reply to this email" }), true);
  assert.equal(isCustomerInquiry({
    channel: "email",
    from: "alerts@vendor.com",
    subject: "Weekly digest",
    text: "unsubscribe",
    headers: { "list-unsubscribe": "<mailto:unsub@vendor.com>" },
  }), false);
  assert.equal(shouldAutoReply({
    channel: "email",
    from: "bot@example.com",
    subject: "Out of office",
    text: "I am away",
  }), false);
  assert.equal(shouldAutoReply({
    channel: "email",
    from: "person@example.com",
    subject: "Hi",
    text: "Thanks",
  }), false);
});

test("only the website form may receive an automatic reply", () => {
  assert.equal(isCustomerInquiry({
    channel: "web_form",
    from: "client@example.com",
    text: "hello",
  }), true);
  assert.equal(shouldAutoReply({
    channel: "web_form",
    from: "client@example.com",
    subject: "Can't log in",
    text: "Please help, my password reset does not work",
  }), true);
  assert.equal(shouldAutoReply({
    channel: "email",
    from: "client@example.com",
    subject: "Can't log in",
    text: "Please help, my password reset does not work",
  }), false);
  assert.equal(shouldAutoReply({
    channel: "email",
    from: "dont-reply@freemius.com",
    subject: "Purchase",
    text: "Aaron just purchased Token Top Up",
  }), false);
});

test("files corporate vendors into a brand mailbox", () => {
  assert.equal(brandFolderName("dont-reply@freemius.com"), "Freemius");
  assert.equal(brandFolderName("service@mail.alipay.com"), "Alipay");
  assert.equal(brandFolderName("support@genora.art"), "Genora.art");
  assert.equal(brandFolderName("client@gmail.com"), null);
});

test("formats stored Freemius-style mail without dumping raw urls", () => {
  const html = formatStoredEmail("New Token Top Up *Product* Title: Genora.art (https://dashboard.freemius.com/#!/live/products/37637/) Amount: $20.00");
  assert.match(html, /<strong>Product<\/strong>/);
  assert.match(html, /<a href="https:\/\/dashboard\.freemius\.com/);
  assert.match(html, />Title: Genora.art</);
  assert.equal(html.includes("https://dashboard.freemius.com/#!/live/products/37637/</a>"), false);
});

test("renders stored html or formats plain text", () => {
  assert.match(renderEmailHtml("<p>Hello <script>alert(1)</script></p>"), /Hello/);
  assert.match(formatStoredEmail("Hi\nhttps://example.com/a"), /<br\/>/);
});

test("makes a bare Freemius documentation url clickable inside html mail", () => {
  const href = "https://freemius.com/help/documentation/selling-with-freemius/saas-integration/";
  const html = linkifyBareUrls(`<p>Guide: ${href}</p><p><a href="https://cal.com/vovafeldman/founder">click here</a></p>`);
  assert.match(html, new RegExp(`<a href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(html, /href="https:\/\/cal\.com\/vovafeldman\/founder"/);
  assert.match(html, />click here</);
  assert.match(formatStoredEmail(`See ${href}`), new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
});

test("does not turn image urls into links or leak tracking pixel leftovers", () => {
  const html = renderEmailHtml(
    `<p>Receipt</p><img src="https://cdn.freemius.com/logo.png" alt="Logo" width="180" height="48"><img src="https://crm.freemius.com?fluentcrm=1&amp;route=open&amp;_e_id=1" alt="" width="1" height="1">`,
  );
  assert.match(html, /<img src="https:\/\/cdn\.freemius\.com\/logo\.png"/);
  assert.equal(html.includes("<a href=\"https://cdn.freemius.com/logo.png\""), false);
  assert.equal(html.includes("fluentcrm"), false);
  assert.equal(html.includes("width=\"1\""), false);
});

test("repairs already stored broken tracking markup and decodes entities", () => {
  const html = renderEmailHtml(
    `If you like me to stop sending you emails, please click here\nhttps://crm.freemius.com?fluentcrm=1&amp;route=open&amp;_e_hash=dd4db4bb-fe9f-4da4-9e5f-62099d9b7538&amp;_e_id=985134" alt="" width="1" height="1">http://click.freemius.com/wf/open?upn=u001.abc" alt="" width="1" height="1">`,
  );
  assert.match(html, /please click here/);
  assert.equal(html.includes("alt="), false);
  assert.equal(html.includes("fluentcrm"), false);
  assert.equal(html.includes("&amp;amp;"), false);
  assert.equal(html.includes("wf/open"), false);
});

test("inlines cid images and decodes quoted-printable html", async () => {
  const { extractEmailBodies } = await import("../src/lib/email-mime.ts");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const mime = [
    "MIME-Version: 1.0",
    "Content-Type: multipart/related; boundary=\"mix\"",
    "",
    "--mix",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "<p>Privet =D0=BF=D0=B8=D1=81=D1=8C=D0=BC=D0=BE</p><img src=3D\"cid:logo@ms\">",
    "--mix",
    "Content-Type: image/png",
    "Content-ID: <logo@ms>",
    "Content-Transfer-Encoding: base64",
    "",
    png.toString("base64"),
    "--mix--",
    "",
  ].join("\r\n");
  const bodies = extractEmailBodies(mime);
  assert.match(bodies.html, /data:image\/png;base64,/);
  assert.match(bodies.html, /письм/);
  assert.equal(bodies.html.includes("cid:logo@ms"), false);
  assert.match(renderEmailHtml(bodies.html), /<img src="data:image\/png;base64,/);
});

test("prepares a spoken Russian translation request and usage title", () => {
  assert.match(TRANSLATION_PROMPT, /только на русском/);
  assert.match(TRANSLATION_PROMPT, /китайский/);
  assert.equal(translationUsageTitle("023023"), "перевод (023023)");
  assert.equal(sourceTextForTranslation("<p>Hello&nbsp;<strong>Aaron</strong></p>"), "Hello Aaron");
  assert.equal(looksLikeRussian("Здравствуйте, это обращение по оплате."), true);
  assert.equal(looksLikeRussian("您好，我想咨询退款问题。"), false);
  assert.equal(pickCheapestTextModel([
    { id: "video:minimax:hailuo-3", cost: 0 },
    { id: "deepseek-v4-flash-0731", cost: 0.1 },
    { id: "gpt-4o-mini", cost: 0.3 },
  ])?.id, "deepseek-v4-flash-0731");
  assert.equal(applyPublicContactEmail(`Пишите на ${DEFAULT_PUBLIC_EMAIL}`, "hello@genora.art"), "Пишите на hello@genora.art");
});

test("creates a stable sender folder name and organizes after 12:00 UTC", () => {
  assert.equal(senderFolderName("Ada Lovelace <ada@example.com>"), "ada_at_example.com");
  assert.equal(shouldRunDailyOrganize(new Date("2026-08-18T11:59:00.000Z"), null), false);
  assert.equal(shouldRunDailyOrganize(new Date("2026-08-18T12:00:00.000Z"), null), true);
  assert.equal(shouldRunDailyOrganize(new Date("2026-08-18T15:00:00.000Z"), "2026-08-18"), false);
});

test("uses app locale, then cookie, then browser language", () => {
  assert.equal(parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8"), "fr");
  assert.equal(resolveRequestLocale({
    explicit: "it",
    cookie: "ru",
    acceptLanguage: "en-US,en;q=0.9",
  }), "it");
  assert.equal(resolveRequestLocale({
    explicit: "ja",
    cookie: "ru",
    acceptLanguage: "en-US,en;q=0.9",
  }), "ru");
  assert.equal(resolveRequestLocale({
    cookie: "de",
    acceptLanguage: "en-US",
  }), "de");
  assert.equal(resolveRequestLocale({
    acceptLanguage: "es-MX,es;q=0.9",
  }), "es");
});

test("verification letters follow the requested locale and fall back to English", () => {
  assert.match(getMailCopy("ja").verificationSubject, /Genora.art/);
  assert.equal(getMailCopy("en").verificationButton, "Confirm registration");
  assert.equal(getMailCopy("ru").verificationButton, "Подтвердить регистрацию");
});
