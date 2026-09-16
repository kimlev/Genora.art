"use client";

import { formatCompactTokens, useAuth } from "@/components/providers/auth-provider";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { DateRangeField } from "@/components/ui/date-range-field";
import { profileUiCopy } from "@/lib/i18n/copy/profile-ui";
import { invoiceTokensOk } from "@/lib/payments/invoice-history";
import { openTopUp } from "@/components/profile/top-up-dialog";
import { Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BalanceInvoice = { id:string;number:string;timestamp:string;amount:number;currency:string;tokenDelta:number;status:string };
type BalanceCredit = { id:string;timestamp:string;tokenDelta:number;note:string };

export function ProfileBalance() {
  const t = useT();
  const { locale } = useLocale();
  const copy = useMemo(() => profileUiCopy(locale), [locale]);
  const { user, setBalanceTokens } = useAuth();
  const [invoices, setInvoices] = useState<BalanceInvoice[]>([]);
  const [credits, setCredits] = useState<BalanceCredit[]>([]);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState<{from:string;to:string}|null>(null);
  const [returnNotice,setReturnNotice]=useState<"success"|"failed"|"cancelled"|null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoice = params.get("invoice")?.trim() ?? "";
    const payment = params.get("payment");
    if (payment === "success" || payment === "failed" || payment === "cancelled") setReturnNotice(payment);
    const outcome = payment === "failed" || payment === "cancelled" ? payment : null;
    const load = () => fetch("/api/balance", { cache:"no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { balanceTokens?:number;invoices?:BalanceInvoice[];credits?:BalanceCredit[] };
      if (typeof data.balanceTokens === "number") setBalanceTokens(data.balanceTokens);
      if (data.invoices) setInvoices(data.invoices);
      if (data.credits) setCredits(data.credits);
    }).catch(() => undefined);
    if (invoice && outcome) {
      void fetch("/api/payments/streampay/return", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoice, outcome }),
      }).finally(() => { void load(); });
    } else {
      void load();
    }
  }, []);

  const history = useMemo(() => {
    const rows = [
      ...invoices.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        label: copy.invoiceLabel(item.number, item.amount),
        tokenDelta: item.tokenDelta,
        ok: invoiceTokensOk(item.status),
      })),
      ...credits.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        label: item.note,
        tokenDelta: item.tokenDelta,
        ok: true,
      })),
    ].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    if (!historyPeriod) return rows;
    return rows.filter((item) => {
      const day = item.timestamp.slice(0, 10);
      return day >= historyPeriod.from && day <= historyPeriod.to;
    });
  }, [invoices, credits, copy, historyPeriod]);

  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-text">{t.profile.balanceTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-steel">{t.profile.balanceSubtitle}</p>
      {returnNotice === "success" ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" role="status">Оплата прошла, баланс обновлён.</p> : null}
      {returnNotice === "failed" || returnNotice === "cancelled" ? <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="status">Оплата не завершена. Можно попробовать ещё раз.</p> : null}

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-steel"><Wallet className="size-4 text-accent-brand" />{t.profile.balanceAvailable}</div>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-text">{withCreditGlyphs(formatCompactTokens(user?.balanceTokens ?? 0, locale))}</p>
        <Button type="button" className="mt-5" onClick={openTopUp}>{t.profile.topUp}</Button>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-steel">{t.profile.historyTitle}</h2>
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeField from={historyFrom} to={historyTo} onFrom={setHistoryFrom} onTo={setHistoryTo} />
            <button type="button" disabled={!historyFrom || !historyTo} onClick={() => setHistoryPeriod({ from: historyFrom, to: historyTo })}
              className="h-10 rounded-xl bg-accent-brand px-3 text-xs font-semibold text-white disabled:opacity-50">
              {copy.applyFilter}
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          {history.length === 0 ? <p className="px-4 py-5 text-sm text-steel">{copy.historyEmpty}</p> : history.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0 sm:grid-cols-[160px_1fr_auto]">
              <span className="text-xs text-steel">{copy.formatDateTime(new Date(item.timestamp))}</span>
              <span className="text-sm text-text">{item.label}</span>
              <span className={`text-right text-sm font-medium tabular-nums ${item.ok ? "text-emerald-500" : "text-destructive"}`}>
                {item.ok ? "+" : ""}{withCreditGlyphs(formatCompactTokens(Math.abs(item.tokenDelta), locale))}
                {item.ok ? null : <span className="mt-0.5 block text-[10px] font-normal">{copy.invoiceError}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
