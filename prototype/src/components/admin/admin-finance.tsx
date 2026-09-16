"use client";

import { financeKpis } from "@/lib/payments/finance-kpis";
import { shortProviderInvoiceId } from "@/lib/payments/invoice-display";
import { Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDateRange } from "./admin-date-range";
import { AdminSelect } from "./admin-select";
import { date, td, th } from "./admin-types";

type Invoice = {
  id: string; number: string; createdAt: string; userEmail: string | null;
  providerName: string | null; methodName: string | null;
  amountUsd: number; amount: number; currency: string; creditedAmount: number | null; creditedCurrency: string | null; status: string; failureReason: string | null;
  providerInvoiceId: string | null;
};
type Total = { currency: string; invoices: number; amountUsd: number; amount: number; credited: number; creditedCurrency: string | null };
type Options = { currencies: string[]; providers: Array<{ id: string; name: string }>; methods: Array<{ id: string; name: string }> };
type Data = { period: { from: string; to: string }; invoices: Invoice[]; totals: Total[]; options: Options };

const statusLabels: Record<string, string> = { issued: "Ожидает оплаты", paid: "Оплачен", failed: "Ошибка", cancelled: "Ошибка" };
const statusStyles: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  issued: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
};
const statusFilters = [
  { value: "pending", label: "Ожидает оплаты" },
  { value: "paid", label: "Оплачен" },
  { value: "error", label: "Ошибка" },
];

const moneyUsd = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
const moneyPct = (value: number) =>
  `${new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
const moneyInt = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

export function AdminFinance() {
  const [data, setData] = useState<Data | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [currency, setCurrency] = useState("");
  const [provider, setProvider] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (next: { currency?: string; provider?: string; method?: string; status?: string } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const pickedCurrency = next.currency ?? currency;
      const pickedProvider = next.provider ?? provider;
      const pickedMethod = next.method ?? method;
      const pickedStatus = next.status ?? status;
      if (pickedCurrency) params.set("currency", pickedCurrency);
      if (pickedProvider) params.set("provider", pickedProvider);
      if (pickedMethod) params.set("method", pickedMethod);
      if (pickedStatus) params.set("status", pickedStatus);
      const response = await fetch(`/api/admin/finance?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as (Data & { error?: string }) | null;
      if (!response.ok || !payload) throw new Error(payload?.error ?? "Не удалось загрузить финансы");
      setData(payload);
      if (!from) setFrom(payload.period.from);
      if (!to) setTo(payload.period.to);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const kpis = useMemo(() => financeKpis(data?.invoices ?? []), [data]);

  const filters = <>
    <AdminSelect label="Валюта" value={currency} options={(data?.options.currencies ?? []).map((code) => ({ value: code, label: code }))} emptyLabel="Все валюты" onChange={(next) => { setCurrency(next); void load({ currency: next }); }} className="min-w-40" />
    <AdminSelect label="Провайдер" value={provider} options={(data?.options.providers ?? []).map((item) => ({ value: item.id, label: item.name }))} emptyLabel="Все провайдеры" onChange={(next) => { setProvider(next); void load({ provider: next }); }} className="min-w-56" />
    <AdminSelect label="Метод" value={method} options={(data?.options.methods ?? []).map((item) => ({ value: item.id, label: item.name }))} emptyLabel="Все методы" onChange={(next) => { setMethod(next); void load({ method: next }); }} className="min-w-56" />
  </>;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <AdminDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onApply={() => void load()} loading={loading} filters={filters} secondary={<AdminSelect label="Статус" value={status} options={statusFilters} emptyLabel="Все статусы" onChange={(next) => { setStatus(next); void load({ status: next }); }} className="w-full" />} />
      {error ? <p className="mt-3 text-xs text-red-300" role="status">{error}</p> : null}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {([
        ["Счетов, кол-во", moneyInt(kpis.invoiceCount), "border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"],
        ["Выставлено, USD", moneyUsd(kpis.issuedUsd), "border-orange-100 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/30"],
        ["Оплачено, USD", moneyUsd(kpis.paidUsd), "border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"],
        ["Конверсия, %", moneyPct(kpis.conversion), "border-teal-100 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-950/30"],
        ["Зачислено, USD", moneyUsd(kpis.creditedUsd), "border-green-100 bg-green-50/80 dark:border-green-900/40 dark:bg-green-950/25"],
        ["Средний чек", moneyUsd(kpis.avgCheck), "border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/25"],
        ["Комиссия, %", moneyPct(kpis.commissionPct), "border-rose-100 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/25"],
      ] as const).map(([label, value, tone]) => (
        <article key={label} className={`rounded-2xl border p-4 ${tone}`}>
          <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
        </article>
      ))}
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
      <table className="w-full min-w-[1020px] border-collapse">
        <thead><tr>
          <th className={th}>ID</th>
          <th className={th}>ID провайдера</th>
          <th className={th}>Дата / плательщик</th>
          <th className={th}>Провайдер / метод</th>
          <th className={th}>Сумма счета, USD</th>
          <th className={th}>Сумма</th>
          <th className={th}>Валюта</th>
          <th className={th}>Зачислено</th>
          <th className={th}>Валюта</th>
          <th className={th}>Статус</th>
        </tr></thead>
        <tbody>
          {data?.invoices.map((invoice) => <tr key={invoice.id}>
            <td className={td}><b className="text-slate-900 dark:text-slate-100">{invoice.number}</b></td>
            <td className={td}>
              {invoice.providerInvoiceId ? <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-100">
                {shortProviderInvoiceId(invoice.providerInvoiceId)}
                <button type="button" aria-label="Скопировать ID провайдера" onClick={() => void navigator.clipboard.writeText(invoice.providerInvoiceId ?? "")}
                  className="rounded p-0.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Copy className="size-3" />
                </button>
              </span> : <span className="text-slate-500">—</span>}
            </td>
            <td className={td}>{date(invoice.createdAt)}<br /><span className="text-slate-500">{invoice.userEmail ?? "—"}</span></td>
            <td className={td}>{invoice.providerName ?? "—"}<br /><span className="text-slate-500">{invoice.methodName ?? "—"}</span></td>
            <td className={td}>{invoice.amountUsd.toFixed(2)}</td>
            <td className={td}>{invoice.amount.toFixed(2)}</td>
            <td className={td}>{invoice.currency}</td>
            <td className={td}>{invoice.creditedAmount === null ? "—" : invoice.creditedAmount.toFixed(2)}</td>
            <td className={td}>{invoice.creditedCurrency ?? "—"}</td>
            <td className={td}>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[invoice.status] ?? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"}`}>
                {statusLabels[invoice.status] ?? invoice.status}
              </span>
              {invoice.failureReason ? <span className="mt-1 block max-w-[11rem] text-[10px] leading-snug text-red-400">{invoice.failureReason}</span> : null}
            </td>
          </tr>)}
        </tbody>
        {data?.totals.length ? <tfoot>
          {data.totals.map((total) => <tr key={total.currency} className="bg-slate-900/80">
            <td className={td} colSpan={4}><b className="text-slate-900 dark:text-slate-100">Итого · {total.currency}</b> <span className="text-slate-500">({total.invoices})</span></td>
            <td className={td}><b className="text-slate-100">{total.amountUsd.toFixed(2)}</b></td>
            <td className={td}><b className="text-slate-100">{total.amount.toFixed(2)}</b></td>
            <td className={td}>{total.currency}</td>
            <td className={td}><b className="text-slate-100">{total.credited ? total.credited.toFixed(2) : "—"}</b></td>
            <td className={td}>{total.creditedCurrency ?? "—"}</td>
            <td className={td} />
          </tr>)}
        </tfoot> : null}
      </table>
    </div>
  </div>;
}
