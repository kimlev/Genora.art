import "server-only";

import { countryCurrency, isKnownCountry } from "@/lib/geo/countries";
import {
  LOGO_DATA_URL,
  methodFitsRegion,
  slugFromName,
  validateMethodLogo as checkLogo,
  validateMethodName,
  type FeePayer,
  type InvoiceCurrency,
  type NewProvider,
} from "@/lib/payments/provider-input";
import { query, withTransaction } from "./db";

export type PaymentMethod = { id: string; name: string; hasLogo: boolean; countryCodes: string[]; createdAt: string };

export type PaymentProvider = {
  id: string;
  name: string;
  checkoutUrl: string | null;
  countryCodes: string[];
  invoiceCurrency: InvoiceCurrency;
  feePayer: FeePayer;
  feePercent: number | null;
  currencies: string[];
  enabled: boolean;
  clientVisible: boolean;
  sortOrder: number;
  methods: PaymentMethod[];
  updatedAt: string;
  fxRateUrl: string | null;
  fxRounding: number | null;
};

export function validateMethodLogo(dataUrl: string): string | null {
  return checkLogo(dataUrl, (base64) => Buffer.byteLength(base64, "base64"));
}

type MethodRow = { id: string; display_name: string; has_logo: boolean; country_codes: string[]; created_at: Date };
type ProviderRow = {
  id: string; display_name: string; checkout_url: string | null; country_codes: string[];
  invoice_currency: InvoiceCurrency; fee_payer: FeePayer; fee_percent: string | null; currencies: string[];
  enabled: boolean; client_visible: boolean; sort_order: number; updated_at: Date;
  method_ids: string[] | null; fx_rate_url: string | null; fx_rounding: number | null;
};

function methodFromRow(row: MethodRow): PaymentMethod {
  return { id: row.id, name: row.display_name, hasLogo: row.has_logo, countryCodes: row.country_codes, createdAt: row.created_at.toISOString() };
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const rows = await query<MethodRow>(
    "SELECT id,display_name,logo_bytes IS NOT NULL has_logo,country_codes,created_at FROM payment_methods ORDER BY display_name",
  );
  return rows.map(methodFromRow);
}

export async function listPaymentProviders(): Promise<PaymentProvider[]> {
  const [providers, methods] = await Promise.all([
    query<ProviderRow>(`SELECT p.id,p.display_name,p.checkout_url,p.country_codes,p.invoice_currency,p.fee_payer,p.fee_percent,
        p.currencies,p.enabled,p.client_visible,p.sort_order,p.updated_at,p.fx_rate_url,p.fx_rounding,
        array_remove(array_agg(pm.method_id ORDER BY pm.method_id),NULL) method_ids
      FROM payment_providers p LEFT JOIN payment_provider_methods pm ON pm.provider_id=p.id
      GROUP BY p.id ORDER BY p.sort_order,p.display_name`),
    listPaymentMethods(),
  ]);
  const byId = new Map(methods.map((method) => [method.id, method]));
  return providers.map((row) => ({
    id: row.id,
    name: row.display_name,
    checkoutUrl: row.checkout_url,
    countryCodes: row.country_codes,
    invoiceCurrency: row.invoice_currency,
    feePayer: row.fee_payer,
    feePercent: row.fee_percent === null ? null : Number(row.fee_percent),
    currencies: row.currencies,
    enabled: row.enabled,
    clientVisible: row.client_visible,
    sortOrder: row.sort_order,
    methods: (row.method_ids ?? []).flatMap((id) => { const method = byId.get(id); return method ? [method] : []; }),
    updatedAt: row.updated_at.toISOString(),
    fxRateUrl: row.fx_rate_url,
    fxRounding: row.fx_rounding,
  }));
}

export async function createPaymentProvider(input: NewProvider): Promise<PaymentProvider> {
  const id = slugFromName(input.name);
  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>("SELECT id FROM payment_providers WHERE id=$1", [id]);
    if (existing.rowCount) throw new Error("PROVIDER_EXISTS");
    const methods = await client.query<{ id: string; country_codes: string[] }>(
      "SELECT id,country_codes FROM payment_methods WHERE id = ANY($1::text[])", [input.methodIds]);
    if (methods.rowCount !== input.methodIds.length) throw new Error("METHOD_MISSING");
    // Метод, привязанный к другим странам, провайдеру не подходит: клиент увидел бы
    // способ оплаты, которым в его стране заплатить нельзя.
    if (methods.rows.some((method) => !methodFitsRegion(method.country_codes, input.countryCodes))) throw new Error("METHOD_REGION");
    const order = await client.query<{ next: number }>("SELECT COALESCE(max(sort_order),0)+10 next FROM payment_providers");
    await client.query(`INSERT INTO payment_providers(id,display_name,enabled,client_visible,sort_order,currencies,checkout_url,country_codes,invoice_currency,fee_payer,fee_percent,fx_rate_url,fx_rounding)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [
      id, input.name.trim(), input.enabled, input.clientVisible, order.rows[0]?.next ?? 10,
      input.invoiceCurrency === "usd" ? ["USD"] : ["USD", ...currenciesOf(input.countryCodes)],
      input.checkoutUrl.trim() || null, input.countryCodes, input.invoiceCurrency, input.feePayer, input.feePercent,
      input.fxRateUrl.trim() || null,
      input.fxRounding,
    ]);
    for (const methodId of input.methodIds) {
      await client.query("INSERT INTO payment_provider_methods(provider_id,method_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, methodId]);
    }
  });
  const created = (await listPaymentProviders()).find((provider) => provider.id === id);
  if (!created) throw new Error("PROVIDER_MISSING");
  return created;
}

function currenciesOf(countryCodes: string[]): string[] {
  const currencies = new Set<string>();
  for (const code of countryCodes) {
    const currency = countryCurrency(code);
    if (currency) currencies.add(currency);
  }
  return [...currencies];
}

export async function setProviderCheckoutUrl(id: string, checkoutUrl: string): Promise<void> {
  await query("UPDATE payment_providers SET checkout_url=$2,updated_at=now() WHERE id=$1", [id, checkoutUrl]);
}

export async function updatePaymentProvider(id: string, input: NewProvider): Promise<PaymentProvider> {
  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string; fx_rate_url: string | null; fx_rounding: number | null }>(
      "SELECT id,fx_rate_url,fx_rounding FROM payment_providers WHERE id=$1", [id]);
    if (!existing.rowCount) throw new Error("PROVIDER_MISSING");
    const current = existing.rows[0];
    const methods = await client.query<{ id: string; country_codes: string[] }>(
      "SELECT id,country_codes FROM payment_methods WHERE id = ANY($1::text[])", [input.methodIds]);
    if (methods.rowCount !== input.methodIds.length) throw new Error("METHOD_MISSING");
    if (methods.rows.some((method) => !methodFitsRegion(method.country_codes, input.countryCodes))) throw new Error("METHOD_REGION");
    await client.query(`UPDATE payment_providers SET display_name=$2,enabled=$3,client_visible=$4,currencies=$5,
        checkout_url=COALESCE(NULLIF($6,''),checkout_url),country_codes=$7,invoice_currency=$8,fee_payer=$9,fee_percent=$10,
        fx_rate_url=$11,fx_rounding=$12,updated_at=now()
      WHERE id=$1`, [
      id, input.name.trim(), input.enabled, input.clientVisible,
      input.invoiceCurrency === "usd" ? ["USD"] : ["USD", ...currenciesOf(input.countryCodes)],
      input.checkoutUrl.trim(), input.countryCodes, input.invoiceCurrency, input.feePayer, input.feePercent,
      input.fxRateUrl.trim() || current?.fx_rate_url || null,
      input.invoiceCurrency === "national" ? input.fxRounding : current?.fx_rounding ?? input.fxRounding,
    ]);
    await client.query("DELETE FROM payment_provider_methods WHERE provider_id=$1", [id]);
    for (const methodId of input.methodIds) {
      await client.query("INSERT INTO payment_provider_methods(provider_id,method_id) VALUES($1,$2)", [id, methodId]);
    }
  });
  const updated = (await listPaymentProviders()).find((provider) => provider.id === id);
  if (!updated) throw new Error("PROVIDER_MISSING");
  return updated;
}

export async function updatePaymentMethod(id: string, name: string, logoDataUrl: string | null, countryCodes: string[]): Promise<PaymentMethod> {
  if (validateMethodName(name)) throw new Error("METHOD_NAME");
  if (countryCodes.some((code) => !isKnownCountry(code))) throw new Error("METHOD_COUNTRY");
  const existing = await query<{ id: string }>("SELECT id FROM payment_methods WHERE id=$1", [id]);
  if (!existing.length) throw new Error("METHOD_MISSING");
  const trimmed = name.trim();
  const match = logoDataUrl ? LOGO_DATA_URL.exec(logoDataUrl) : null;
  const rows = await query<MethodRow>(match
    ? `UPDATE payment_methods SET display_name=$2,logo_mime=$3,logo_bytes=$4,country_codes=$5 WHERE id=$1
        RETURNING id,display_name,logo_bytes IS NOT NULL has_logo,country_codes,created_at`
    : `UPDATE payment_methods SET display_name=$2,country_codes=$3 WHERE id=$1
        RETURNING id,display_name,logo_bytes IS NOT NULL has_logo,country_codes,created_at`,
    match ? [id, trimmed, match[1], Buffer.from(match[2], "base64"), [...new Set(countryCodes)]] : [id, trimmed, [...new Set(countryCodes)]]);
  return methodFromRow(rows[0]);
}

export async function updateProviderVisibility(id: string, patch: { enabled?: boolean; clientVisible?: boolean; feePercent?: number | null }): Promise<void> {
  await query(`UPDATE payment_providers SET
      enabled=COALESCE($2,enabled),
      client_visible=COALESCE($3,client_visible),
      fee_percent=CASE WHEN $4::boolean THEN $5 ELSE fee_percent END,
      updated_at=now()
    WHERE id=$1`,
    [id, patch.enabled ?? null, patch.clientVisible ?? null, patch.feePercent !== undefined, patch.feePercent ?? null]);
}

export async function createPaymentMethod(name: string, logoDataUrl: string | null, countryCodes: string[]): Promise<PaymentMethod> {
  if (validateMethodName(name)) throw new Error("METHOD_NAME");
  if (countryCodes.some((code) => !isKnownCountry(code))) throw new Error("METHOD_COUNTRY");
  const trimmed = name.trim();
  const match = logoDataUrl ? LOGO_DATA_URL.exec(logoDataUrl) : null;
  const rows = await query<MethodRow>(`INSERT INTO payment_methods(id,display_name,logo_mime,logo_bytes,country_codes)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING
    RETURNING id,display_name,logo_bytes IS NOT NULL has_logo,country_codes,created_at`,
    [slugFromName(trimmed), trimmed, match?.[1] ?? null, match ? Buffer.from(match[2], "base64") : null, [...new Set(countryCodes)]]);
  if (!rows.length) throw new Error("METHOD_EXISTS");
  return methodFromRow(rows[0]);
}

export async function getMethodLogo(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const rows = await query<{ logo_mime: string | null; logo_bytes: Buffer | null }>(
    "SELECT logo_mime,logo_bytes FROM payment_methods WHERE id=$1", [id]);
  const row = rows[0];
  if (!row?.logo_mime || !row.logo_bytes) return null;
  return { mime: row.logo_mime, bytes: row.logo_bytes };
}
