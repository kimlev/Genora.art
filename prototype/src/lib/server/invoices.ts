import "server-only";

import { paidTokensFromUsd } from "@/lib/billing";
import { creditUserTokens } from "./paid-balance";
import { query, withTransaction } from "./db";

export type Invoice = {
  id: string;
  number: string;
  createdAt: string;
  userEmail: string | null;
  providerId: string | null;
  providerName: string | null;
  methodId: string | null;
  methodName: string | null;
  amountUsd: number;
  amount: number;
  currency: string;
  /** Заполняется, когда провайдер подтвердит платёж. */
  creditedAmount: number | null;
  creditedCurrency: string | null;
  status: string;
  failureReason: string | null;
  providerInvoiceId: string | null;
};

export type InvoiceTotal = { currency: string; invoices: number; amountUsd: number; amount: number; credited: number; creditedCurrency: string | null };

export type InvoiceStatusFilter = "pending" | "paid" | "error";
export type InvoiceFilters = { from: string; to: string; currency?: string; providerId?: string; methodId?: string; status?: InvoiceStatusFilter };

const STATUS_SQL: Record<InvoiceStatusFilter, string> = {
  pending: "i.status='issued'",
  paid: "i.status='paid'",
  error: "i.status IN ('failed','cancelled')",
};

type InvoiceRow = {
  id: string; number: string; created_at: Date; email: string | null;
  provider_id: string | null; provider_name: string | null;
  method_id: string | null; method_name: string | null;
  amount_usd: string; amount: string; currency: string;
  credited_amount: string | null; credited_currency: string | null; status: string;
  failure_reason: string | null;
  provider_invoice_id: string | null;
};

const INVOICE_SELECT = `SELECT i.id::text,i.number,i.created_at,u.email,
      i.provider_id,p.display_name provider_name,i.method_id,m.display_name method_name,
      i.amount_usd::text,i.amount::text,i.currency,i.credited_amount::text,i.credited_currency,i.status,i.failure_reason,i.provider_invoice_id
    FROM payment_invoices i
    LEFT JOIN users u ON u.id=i.user_id
    LEFT JOIN payment_providers p ON p.id=i.provider_id
    LEFT JOIN payment_methods m ON m.id=i.method_id`;

function invoiceFromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    createdAt: row.created_at.toISOString(),
    userEmail: row.email,
    providerId: row.provider_id,
    providerName: row.provider_name,
    methodId: row.method_id,
    methodName: row.method_name,
    amountUsd: Number(row.amount_usd),
    amount: Number(row.amount),
    currency: row.currency.trim(),
    creditedAmount: row.credited_amount === null ? null : Number(row.credited_amount),
    creditedCurrency: row.credited_currency?.trim() ?? null,
    status: row.status,
    failureReason: row.failure_reason,
    providerInvoiceId: row.provider_invoice_id,
  };
}

/**
 * Счета за период. Карточки отчёта считают доллары, а в таблице
 * «Сумма» — то, что ушло провайдеру (нац. валюта или USD).
 */
export async function listInvoices(filters: InvoiceFilters): Promise<{ invoices: Invoice[]; totals: InvoiceTotal[] }> {
  const rows = await query<InvoiceRow>(`${INVOICE_SELECT}
    WHERE i.created_at>=$1::date AND i.created_at<($2::date + interval '1 day')
      AND ($3::text IS NULL OR i.currency=$3)
      AND ($4::text IS NULL OR i.provider_id=$4)
      AND ($5::text IS NULL OR i.method_id=$5)
      AND (${filters.status ? STATUS_SQL[filters.status] : "TRUE"})
    ORDER BY i.created_at DESC,i.number DESC LIMIT 1000`,
    [filters.from, filters.to, filters.currency || null, filters.providerId || null, filters.methodId || null]);

  const invoices = rows.map(invoiceFromRow);

  const totals = new Map<string, InvoiceTotal>();
  for (const invoice of invoices) {
    const total = totals.get(invoice.currency)
      ?? { currency: invoice.currency, invoices: 0, amountUsd: 0, amount: 0, credited: 0, creditedCurrency: null };
    total.invoices += 1;
    total.amountUsd += invoice.amountUsd;
    total.amount += invoice.amount;
    if (invoice.creditedAmount !== null) {
      total.credited += invoice.creditedAmount;
      total.creditedCurrency = total.creditedCurrency && total.creditedCurrency !== invoice.creditedCurrency
        ? "—"
        : invoice.creditedCurrency;
    }
    totals.set(invoice.currency, total);
  }

  return { invoices, totals: [...totals.values()].sort((left, right) => right.amountUsd - left.amountUsd) };
}

export async function invoiceFilterOptions(): Promise<{ currencies: string[]; providers: Array<{ id: string; name: string }>; methods: Array<{ id: string; name: string }> }> {
  const [currencies, providers, methods] = await Promise.all([
    query<{ currency: string }>("SELECT DISTINCT currency FROM payment_invoices ORDER BY currency"),
    query<{ id: string; display_name: string }>("SELECT id,display_name FROM payment_providers ORDER BY sort_order,display_name"),
    query<{ id: string; display_name: string }>("SELECT id,display_name FROM payment_methods ORDER BY display_name"),
  ]);
  return {
    currencies: currencies.map((row) => row.currency.trim()),
    providers: providers.map((row) => ({ id: row.id, name: row.display_name })),
    methods: methods.map((row) => ({ id: row.id, name: row.display_name })),
  };
}

/** Счета пользователя для истории пополнений: без списаний за модели. */
export async function listUserInvoices(userId: string): Promise<Invoice[]> {
  const rows = await query<InvoiceRow>(`${INVOICE_SELECT}
    WHERE i.user_id=$1
    ORDER BY i.created_at DESC,i.number DESC LIMIT 100`, [userId]);
  return rows.map(invoiceFromRow);
}

/** Счёт выписывается в момент, когда клиенту выдали ссылку на оплату. */
export async function issueInvoice(input: {
  userId: string;
  providerId: string;
  methodId: string | null;
  amountUsd: number;
  amount: number;
  currency: string;
}): Promise<{ id: string; number: string }> {
  const rows = await query<{ id: string; number: string }>(
    `INSERT INTO payment_invoices(user_id,provider_id,method_id,amount_usd,amount,currency) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text,number`,
    [input.userId, input.providerId, input.methodId, input.amountUsd, input.amount, input.currency]);
  return rows[0];
}

export async function attachProviderInvoice(invoiceNumber: string, providerInvoiceId: string): Promise<void> {
  await query(
    `UPDATE payment_invoices SET provider_invoice_id=$2,updated_at=now() WHERE number=$1 OR replace(number,'-','')=$1`,
    [invoiceNumber, providerInvoiceId.slice(0, 64)],
  );
}

export type PaidInvoiceResult = "applied" | "duplicate" | "missing" | "ignored";

/**
 * Подтверждённый платёж: токены начисляются по сумме счёта в USD (как обещали
 * на кнопке «Пополнить»), а в «Зачислено» пишется то, что пришло от провайдера.
 */
export async function applyPaidInvoice(input: {
  invoiceNumber: string;
  providerId: string;
  providerRef: string;
  creditedAmount: number;
  creditedCurrency: string;
}): Promise<PaidInvoiceResult> {
  return withTransaction(async (client) => {
    const invoices = await client.query<{
      id: string; user_id: string | null; amount_usd: string; currency: string; status: string;
    }>("SELECT id::text,user_id,amount_usd::text,currency,status FROM payment_invoices WHERE number=$1 OR replace(number,'-','')=$1 OR provider_invoice_id=$1 FOR UPDATE", [input.invoiceNumber]);
    const invoice = invoices.rows[0];
    if (!invoice) return "missing";
    if (invoice.status === "paid") return "duplicate";
    if (invoice.status !== "issued" || !invoice.user_id) return "ignored";

    const amountUsd = Number(invoice.amount_usd);
    const tokens = paidTokensFromUsd(amountUsd);
    const paidTokens = tokens;
    const creditedAmount = Number.isFinite(input.creditedAmount) ? input.creditedAmount : amountUsd;
    const creditedCurrency = (input.creditedCurrency || "USD").slice(0, 8).toUpperCase();

    await creditUserTokens(client, invoice.user_id, tokens, paidTokens);
    await client.query(
      `INSERT INTO balance_transactions(user_id,kind,token_delta,amount_usd,note,payment_provider,payment_reference)
        VALUES($1,'top_up',$2,$3,$4,$5,$6)`,
      [invoice.user_id, tokens, amountUsd, `Пополнение ${input.invoiceNumber}`, input.providerId, input.providerRef.slice(0, 120)]);
    await client.query(
      `UPDATE payment_invoices SET status='paid',credited_amount=$2,credited_currency=$3,updated_at=now() WHERE id=$1`,
      [invoice.id, creditedAmount, creditedCurrency]);
    return "applied";
  });
}

export async function markInvoiceCancelled(invoiceNumber: string, reason?: string | null): Promise<void> {
  await query(
    `UPDATE payment_invoices SET status='cancelled',failure_reason=COALESCE($2,failure_reason),updated_at=now() WHERE (number=$1 OR replace(number,'-','')=$1) AND status='issued'`,
    [invoiceNumber, reason?.trim().slice(0, 500) || null],
  );
}

export async function markInvoiceFailed(invoiceNumber: string, reason?: string | null): Promise<void> {
  await query(
    `UPDATE payment_invoices SET status='failed',failure_reason=COALESCE($2,failure_reason),updated_at=now() WHERE (number=$1 OR replace(number,'-','')=$1) AND status='issued'`,
    [invoiceNumber, reason?.trim().slice(0, 500) || null],
  );
}
