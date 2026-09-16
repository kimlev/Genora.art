export type FinanceKpiInvoice = {
  amountUsd: number;
  status: string;
  creditedAmount: number | null;
};

export type FinanceKpis = {
  invoiceCount: number;
  issuedUsd: number;
  paidUsd: number;
  conversion: number;
  creditedUsd: number;
  avgCheck: number;
  commissionPct: number;
};

/** Сводка по счетам за период. Оплачено — сумма оплаченных счетов с комиссией, зачислено — после комиссии. */
export function financeKpis(invoices: FinanceKpiInvoice[]): FinanceKpis {
  const invoiceCount = invoices.length;
  const issuedUsd = invoices.reduce((sum, invoice) => sum + invoice.amountUsd, 0);
  const paid = invoices.filter((invoice) => invoice.status === "paid");
  const paidUsd = paid.reduce((sum, invoice) => sum + invoice.amountUsd, 0);
  const creditedUsd = paid.reduce((sum, invoice) => sum + (invoice.creditedAmount ?? 0), 0);
  return {
    invoiceCount,
    issuedUsd,
    paidUsd,
    conversion: invoiceCount ? (paid.length / invoiceCount) * 100 : 0,
    creditedUsd,
    avgCheck: paid.length ? paidUsd / paid.length : 0,
    commissionPct: paidUsd > 0 ? ((paidUsd - creditedUsd) / paidUsd) * 100 : 0,
  };
}
