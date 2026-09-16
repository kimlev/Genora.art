import assert from "node:assert/strict";
import test from "node:test";

import { financeKpis } from "../src/lib/payments/finance-kpis.ts";
import { applyFxRounding, nationalCharge, parseCbrJson, parseCbrXml, parseUsdRate, roundFx } from "../src/lib/payments/fx-rate.ts";
import { fxRoundingLabel, stepFxRounding } from "../src/lib/payments/fx-rounding.ts";
import { methodFitsRegion, slugFromName, validateFeePercent, validateMethodLogo, validateMethodName, validateProvider } from "../src/lib/payments/provider-input.ts";
import { countryCurrency, countryFlag, countryLabel, isKnownCountry } from "../src/lib/geo/countries.ts";

const provider = {
  name: "Robokassa",
  checkoutUrl: "https://pay.robokassa.ru/checkout?amount={amount}",
  countryCodes: ["RU", "BY"],
  methodIds: ["mir"],
  invoiceCurrency: "national",
  feePayer: "client",
  feePercent: 2.5,
  enabled: true,
  clientVisible: true,
  fxRateUrl: "https://open.er-api.com/v6/latest/USD",
  fxRounding: 2,
};

test("accepts a filled provider form", () => {
  assert.equal(validateProvider(provider), null);
});

test("national invoices need a rate URL and rounding", () => {
  assert.match(validateProvider({ ...provider, fxRateUrl: "" }) ?? "", /курс/);
  assert.match(validateProvider({ ...provider, fxRounding: null }) ?? "", /округление/);
  assert.equal(validateProvider({ ...provider, invoiceCurrency: "usd", fxRateUrl: "", fxRounding: null }), null);
});

test("worldwide provider needs no countries", () => {
  assert.equal(validateProvider({ ...provider, invoiceCurrency: "usd", countryCodes: [], fxRateUrl: "", fxRounding: null }), null);
});

test("national invoices need countries", () => {
  assert.match(validateProvider({ ...provider, countryCodes: [] }) ?? "", /стран/);
});

test("refuses a checkout link without https", () => {
  assert.match(validateProvider({ ...provider, checkoutUrl: "http://pay.example.com" }) ?? "", /https/);
  assert.match(validateProvider({ ...provider, checkoutUrl: "pay.example.com" }) ?? "", /адресом/);
});

test("accepts a provider without a checkout link: its address comes from the integration", () => {
  assert.equal(validateProvider({ ...provider, checkoutUrl: "" }), null);
});

test("accepts an empty commission rate and rejects a value outside 0-100", () => {
  assert.equal(validateFeePercent(null), null);
  assert.equal(validateFeePercent(0), null);
  assert.equal(validateFeePercent(100), null);
  assert.match(validateFeePercent(-1) ?? "", /0 до 100/);
  assert.match(validateFeePercent(101) ?? "", /0 до 100/);
});

test("refuses unknown or repeated countries and an empty method list", () => {
  assert.match(validateProvider({ ...provider, countryCodes: ["RU", "ZZ"] }) ?? "", /неизвестный код/);
  assert.match(validateProvider({ ...provider, countryCodes: ["RU", "RU"] }) ?? "", /дважды/);
  assert.match(validateProvider({ ...provider, methodIds: [] }) ?? "", /метод оплаты/);
});

test("a worldwide method works in any region", () => {
  assert.equal(methodFitsRegion([], []), true);
  assert.equal(methodFitsRegion([], ["RU"]), true);
});

test("a country method is offered only where it works", () => {
  assert.equal(methodFitsRegion(["RU"], []), false, "СБП не подходит провайдеру на весь мир");
  assert.equal(methodFitsRegion(["RU"], ["RU", "BY"]), true);
  assert.equal(methodFitsRegion(["RU"], ["KZ"]), false);
  assert.equal(methodFitsRegion(["RU", "BY"], ["BY"]), true);
});

test("builds a latin identifier out of any name", () => {
  assert.equal(slugFromName("Robokassa Pay"), "robokassa-pay");
  assert.equal(slugFromName("  Stripe!  "), "stripe");
  assert.equal(slugFromName("ЮKassa Россия"), "yukassa-rossiya");
  assert.equal(slugFromName("Сбербанк"), "sberbank");
  assert.match(slugFromName("支付"), /^id-/);
});

test("checks the method name and logo", () => {
  assert.equal(validateMethodName("Мир"), null);
  assert.match(validateMethodName("М") ?? "", /от 2 до 40/);
  const bytes = (base64) => Buffer.byteLength(base64, "base64");
  assert.equal(validateMethodLogo("data:image/png;base64,aGVsbG8=", bytes), null);
  assert.match(validateMethodLogo("https://example.com/logo.png", bytes) ?? "", /файлом/);
  assert.match(validateMethodLogo("data:application/pdf;base64,aGVsbG8=", bytes) ?? "", /PNG/);
  assert.match(validateMethodLogo(`data:image/png;base64,${"A".repeat(400_000)}`, bytes) ?? "", /200 КБ/);
});

test("knows Russia and Belarus with their currencies and flags", () => {
  assert.equal(isKnownCountry("ru"), true);
  assert.equal(countryCurrency("RU"), "RUB");
  assert.equal(countryCurrency("BY"), "BYN");
  assert.equal(countryFlag("RU"), "🇷🇺");
  assert.equal(countryLabel("BY", "ru"), "Беларусь");
  assert.equal(countryLabel("RU", "en"), "Russia");
});

test("keeps a country typed by hand before the dropdown appeared", () => {
  assert.equal(countryLabel("Гонконг", "ru"), "Гонконг");
});

test("reads a USD rate from common API shapes and rounds national amounts", () => {
  assert.equal(parseUsdRate({ rates: { RUB: 80.123 } }, "RUB"), 80.123);
  assert.equal(roundFx(5 * 80.123, 0), 401);
  assert.equal(roundFx(5 * 80.123, 2), 400.62);
  assert.equal(applyFxRounding(414.6055, 0), 415);
  assert.equal(applyFxRounding(414.6055, 2), 414.61);
  assert.equal(nationalCharge(20, 82.9211, 2), 1658.42);
});

test("reads CBR XML and JSON as rubles per one dollar", () => {
  const xml = `<ValCurs Date="22.08.2026"><Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>82,9211</Value><VunitRate>82,9211</VunitRate></Valute></ValCurs>`;
  assert.equal(parseCbrXml(xml, "RUB"), 82.9211);
  assert.equal(parseCbrJson({ Valute: { USD: { Value: 82.9211, VunitRate: 82.9211 } } }, "RUB"), 82.9211);
});

test("rounding stepper walks 100 → 10 → 0 → 0,0 → 0,00", () => {
  assert.equal(fxRoundingLabel(stepFxRounding(2, -1)), "0,0");
  assert.equal(fxRoundingLabel(stepFxRounding(-2, 1)), "10");
  assert.equal(fxRoundingLabel(stepFxRounding(-2, -1)), "100");
  assert.equal(fxRoundingLabel(stepFxRounding(2, 1)), "0,00");
});

test("finance KPIs use paid invoices for conversion, average check and commission", () => {
  const kpis = financeKpis([
    { amountUsd: 10, status: "issued", creditedAmount: null },
    { amountUsd: 10, status: "paid", creditedAmount: 9 },
  ]);
  assert.equal(kpis.invoiceCount, 2);
  assert.equal(kpis.issuedUsd, 20);
  assert.equal(kpis.paidUsd, 10);
  assert.equal(kpis.creditedUsd, 9);
  assert.equal(kpis.conversion, 50);
  assert.equal(kpis.avgCheck, 10);
  assert.equal(kpis.commissionPct, 10);
});
