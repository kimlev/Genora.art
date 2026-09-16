import assert from "node:assert/strict";
import test from "node:test";
import { publicErrorCode, publicErrorMessage, promptErrorMessage, isPromptBlocked } from "../src/lib/public-error.ts";
import { promptBlockedCopy } from "../src/lib/i18n/copy/prompt-blocked.ts";
import { generationErrorLabel, generationFailureLabel } from "../src/lib/i18n/copy/generation-error-label.ts";
import { videoPromptOverflowCopy } from "../src/lib/i18n/copy/video-studio-ui-copy.ts";
import { videoReferenceMixUnsupportedCopy } from "../src/lib/i18n/copy/video-studio-ui-copy.ts";
import { SERVED_LOCALE_CODES } from "../src/lib/i18n/served-locales.ts";

const raw = "400 Input blocked: The prompt could not be processed. Please try rephrasing the prompt or using different input.";
const copyrightRaw = "OpenRouter video: The request failed because the output audio may be related to copyright restrictions. Request id: hidden-provider-id";
test("prompt rejection survives HTTP sanitization and translates to every served locale", () => {
  for (const locale of SERVED_LOCALE_CODES) {
    assert.ok(promptBlockedCopy[locale]);
    assert.equal(publicErrorMessage(new Error(raw), locale), promptBlockedCopy[locale]);
    assert.equal(publicErrorMessage(new Error(copyrightRaw), locale), promptBlockedCopy[locale]);
    assert.equal(promptErrorMessage(publicErrorMessage(raw), locale), promptBlockedCopy[locale]);
    assert.equal(promptErrorMessage(`Error:\n\n${publicErrorMessage(raw)}`, locale), promptBlockedCopy[locale]);
  }
});
test("unrelated 400s, network errors and normal text are not labelled moderation failures", () => {
  for (const text of ["400 invalid size", "Failed to fetch", "generation_timeout", "Недостаточно средств"]) {
    assert.equal(isPromptBlocked(text), false);
    assert.equal(promptErrorMessage(text, "en"), text);
  }
  assert.equal(publicErrorMessage("HTTP 400 invalid size"), promptBlockedCopy.ru);
});

test("unsupported mixed video references are localized and never expose the provider route", () => {
  const rawReferenceError = 'model "/wan-3.0" does not accept video input references';
  assert.equal(publicErrorCode(rawReferenceError), "video_reference_unsupported");
  for (const locale of SERVED_LOCALE_CODES) {
    assert.equal(publicErrorMessage(rawReferenceError, locale), videoReferenceMixUnsupportedCopy(locale));
    assert.equal(publicErrorMessage(rawReferenceError, locale).includes("/wan-3.0"), false);
    assert.equal(generationFailureLabel(locale, "video_reference_unsupported"), videoReferenceMixUnsupportedCopy(locale));
  }
});

test("privacy-policy rejection gets a safe code and localized gallery explanation", () => {
  const privacyRaw = "400 Request blocked due to prohibited content guidelines. Please modify your input and retry.";
  assert.equal(publicErrorCode(privacyRaw), "privacy_policy");
  assert.equal(
    publicErrorCode('HTTP 400: {"error":{"code":"InputImageSensitiveContentDetected.PrivacyInformation","message":"content[1] may contain real person"}}'),
    "privacy_policy",
  );
  assert.equal(publicErrorCode("HTTP 400 invalid size"), null);
  for (const locale of SERVED_LOCALE_CODES) {
    assert.notEqual(generationFailureLabel(locale, "privacy_policy"), generationErrorLabel(locale));
    assert.match(generationFailureLabel(locale, "privacy_policy"), /\S/);
  }
  assert.equal(
    generationFailureLabel("ru", "privacy_policy"),
    "Ошибка: модель отклонила запрос из-за политики приватности. Нужно официальное подтверждение прав для персонажа.",
  );
});

test("long video prompt warning contains only the requested advisory", () => {
  assert.equal(videoPromptOverflowCopy("ru"), "Модель может не принять выделенный текст.");
  for (const locale of SERVED_LOCALE_CODES) {
    const warning = videoPromptOverflowCopy(locale);
    assert.match(warning, /\S/);
    assert.doesNotMatch(warning, /hard limit|trim|cut|обрез|лимит/i);
  }
});
