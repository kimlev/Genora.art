import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  normalizeStreampayPayUrl,
  parseStreampayCallback,
  shortProviderInvoiceId,
  signStreampayPayload,
  streampayAccountingCurrency,
  streampayCheckoutReturnUrls,
  streampayCreateBody,
  streampayCreateCurrencies,
  streampaySystemCurrency,
  streampayExternalId,
  streampayReturnInvoice,
  streampayReturnPayment,
  streampayQueryToSign,
  STREAMPAY_CANCELLED,
  STREAMPAY_SUCCESS,
  verifyStreampayPayload,
} from "../src/lib/payments/streampay.ts";

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  const seed = pair.privateKey.export({ format: "der", type: "pkcs8" }).subarray(16).toString("hex");
  const publicHex = pair.publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("hex");
  return { seed, publicHex };
}

test("signs a body the same way StreamPay verifies it", () => {
  const { seed, publicHex } = keyPair();
  const body = JSON.stringify({ store_id: 1072, amount: 20 });
  const at = new Date("2026-08-21T13:04:00Z");
  const signature = signStreampayPayload(body, seed, at);
  assert.equal(verifyStreampayPayload(body, signature, publicHex, at), true);
  assert.equal(verifyStreampayPayload(body, signature, publicHex, new Date(at.getTime() + 60_000)), true);
  assert.equal(verifyStreampayPayload(body, signature, publicHex, new Date(at.getTime() + 120_000)), false);
  assert.equal(verifyStreampayPayload(`${body} `, signature, publicHex, at), false);
});

test("marks unpaid invoices as an error in history", async () => {
  const { invoiceTokensOk } = await import("../src/lib/payments/invoice-history.ts");
  assert.equal(invoiceTokensOk("paid"), true);
  assert.equal(invoiceTokensOk("issued"), false);
  assert.equal(invoiceTokensOk("failed"), false);
  assert.equal(invoiceTokensOk("cancelled"), false);
});

test("uses the documented StreamPay checkout page", () => {
  const id = "01a0249f-be20-705c-8418-2e0587da9676";
  assert.equal(
    normalizeStreampayPayUrl(`https://pay.strpay.online/?id=${id}`),
    `https://pay.streampay.org/?id=${id}`,
  );
  assert.equal(
    normalizeStreampayPayUrl(`https://pay.streampay.org?id=${id}`),
    `https://pay.streampay.org/?id=${id}`,
  );
  assert.equal(normalizeStreampayPayUrl("https://pay.streampay.org"), null);
  assert.equal(normalizeStreampayPayUrl("http://pay.streampay.org?id=1"), null);
  assert.equal(normalizeStreampayPayUrl("https://example.com/?id=1"), null);
});

test("builds the GET callback string from sorted keys", () => {
  assert.equal(streampayQueryToSign({ status: "success", external_id: "MS-000001" }), "external_id=MS-000001&status=success");
});

test("reads a paid callback and ignores an incomplete one", () => {
  const parsed = parseStreampayCallback({
    external_id: "MS-000010",
    invoice: "858e9ea0-522d-4723-87e2-d86ac0948037",
    merchant_total: "19.40",
    system_currency: "usdt",
    status: "success",
  });
  assert.deepEqual(parsed, {
    externalId: "MS-000010",
    invoiceId: "858e9ea0-522d-4723-87e2-d86ac0948037",
    amount: null,
    merchantTotal: 19.4,
    currency: null,
    systemCurrency: "USDT",
    status: STREAMPAY_SUCCESS,
    errorMessage: null,
  });
  const failed = parseStreampayCallback({
    external_id: "MS-000011",
    status: "fail",
    messages: ["invalid_currency"],
  });
  assert.equal(failed?.status, "fail");
  assert.equal(failed?.errorMessage, "invalid_currency");
  const rubWithoutSettlement = parseStreampayCallback({
    external_id: "MS-000012",
    amount: "500",
    currency: "RUB",
    status: "success",
  });
  assert.equal(rubWithoutSettlement?.amount, 500);
  assert.equal(rubWithoutSettlement?.merchantTotal, null);
  assert.equal(parseStreampayCallback({ status: "success" }), null);
  assert.equal(STREAMPAY_CANCELLED.has("overdue"), true);
});

test("maps StreamPay statuses to our invoice outcomes", async () => {
  const { streampayInvoiceOutcome } = await import("../src/lib/payments/streampay.ts");
  assert.equal(streampayInvoiceOutcome("success"), "paid");
  assert.equal(streampayInvoiceOutcome("cancel"), "cancelled");
  assert.equal(streampayInvoiceOutcome("overdue"), "cancelled");
  assert.equal(streampayInvoiceOutcome("fail"), "failed");
  assert.equal(streampayInvoiceOutcome("rejected"), "failed");
  assert.equal(streampayInvoiceOutcome("paid"), "pending");
});

test("StreamPay keeps settlement in USDT and selects the invoice payment type", () => {
  assert.equal(streampaySystemCurrency("USD"), "USDT");
  assert.equal(streampaySystemCurrency("USDT"), "USDT");
  assert.deepEqual(streampayCreateCurrencies("USD"), { paymentType: 2, systemCurrency: "USDT" });
  assert.deepEqual(streampayCreateCurrencies("USDT"), { paymentType: 2, systemCurrency: "USDT" });
  assert.deepEqual(streampayCreateCurrencies("RUB"), { paymentType: 1, systemCurrency: "USDT", currency: "RUB" });
  assert.equal(streampayAccountingCurrency("USDT"), "USD");
  assert.equal(streampayAccountingCurrency("usd"), "USD");
});

test("StreamPay create body matches their dollar constructor", () => {
  const body = streampayCreateBody({
    storeId: 1072,
    customer: "client@shop.test",
    externalId: "MS000011",
    description: "Genora.art MS-000011",
    amount: 5,
  });
  assert.deepEqual(body, {
    store_id: 1072,
    customer: "client@shop.test",
    external_id: "MS000011",
    description: "Genora.art MS-000011",
    system_currency: "USDT",
    payment_type: 2,
    amount: 5,
  });
  assert.equal("currency" in body, false);
});

test("StreamPay RUB body matches the national-currency constructor", () => {
  const body = streampayCreateBody({
    storeId: 1072,
    customer: "client@shop.test",
    externalId: "MS000012",
    description: "Genora.art MS-000012",
    amount: 415,
    currency: "RUB",
  });
  assert.deepEqual(body, {
    store_id: 1072,
    customer: "client@shop.test",
    external_id: "MS000012",
    description: "Genora.art MS-000012",
    system_currency: "USDT",
    payment_type: 1,
    currency: "RUB",
    amount: 415,
  });
});

test("StreamPay external id drops the hyphen so they see MS000002, not MS", () => {
  assert.equal(streampayExternalId("MS-000002"), "MS000002");
  assert.equal(shortProviderInvoiceId("01a0249f-be20-705c-8418-2e0587da9676"), "01a0249f");
});

test("browser return keeps our invoice number and maps StreamPay status", () => {
  assert.equal(streampayReturnInvoice({ invoice: "MS-000004", external_id: "MS000004" }), "MS-000004");
  assert.equal(streampayReturnInvoice({ invoice: "01a02575-1f4e-7926-80b1-ffc876c6e622", external_id: "MS000004" }), "MS000004");
  assert.equal(streampayReturnPayment({ payment: "success" }), "success");
  assert.equal(streampayReturnPayment({ status: "success" }), "success");
  assert.equal(streampayReturnPayment({ status: "cancel" }), "cancelled");
  const urls = streampayCheckoutReturnUrls("https://genora.art", "MS-000004");
  assert.equal(urls.success, "https://genora.art/api/payments/streampay/return?payment=success&invoice=MS-000004");
  assert.equal(urls.cancel, "https://genora.art/api/payments/streampay/return?payment=cancelled&invoice=MS-000004");
});
