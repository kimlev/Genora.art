"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditGlyph, withCreditGlyphs } from "@/components/ui/credit-glyph";
import { MIN_TOP_UP_CREDITS, MAX_TOP_UP_CREDITS, TOP_UP_CREDIT_PRESETS, topUpCreditsIssue, topUpDiscount, usdToPayForCredits } from "@/lib/credits";
import { profileUiCopy, type ProfileUiCopy } from "@/lib/i18n/copy/profile-ui";
import { LOCALE_HEADER } from "@/lib/seo";
import { nationalCharge } from "@/lib/payments/fx-rate";
import { isFxRoundingCode } from "@/lib/payments/fx-rounding";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { SpendEstimateDialog } from "./spend-estimate-dialog";

export const TOP_UP_EVENT = "genora-open-top-up";

type PaymentMethod = {
  id: string;
  display_name: string;
  hasLogo?: boolean;
  invoiceCurrency?: "usd" | "national";
  currency?: string;
  usdRate?: number | null;
  rounding?: number | null;
};

export function openTopUp() {
  window.dispatchEvent(new Event(TOP_UP_EVENT));
}

function amountErrorMessage(credits: number, copy: ProfileUiCopy): string | null {
  const issue = topUpCreditsIssue(credits);
  if (issue === "required") return copy.amountRequired;
  if (issue === "below-minimum") return copy.amountMinimumCredits(MIN_TOP_UP_CREDITS);
  if (issue === "above-maximum") return copy.amountMaximumCredits(MAX_TOP_UP_CREDITS);
  return null;
}

export function TopUpDialog() {
  const t = useT();
  const { locale } = useLocale();
  const copy = useMemo(() => profileUiCopy(locale), [locale]);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [spendOpen, setSpendOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("100");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const credits = amountInput.trim() === "" ? Number.NaN : Number(amountInput);
  const amountError = amountErrorMessage(credits, copy);
  const discount = Number.isFinite(credits) ? topUpDiscount(credits) : 0;
  const payUsd = Number.isFinite(credits) ? usdToPayForCredits(credits) : 0;
  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId) ?? null;
  const payLabel = useMemo(() => {
    if (
      selectedMethod?.invoiceCurrency === "national"
      && selectedMethod.currency
      && Number.isFinite(selectedMethod.usdRate)
      && selectedMethod.usdRate
      && isFxRoundingCode(selectedMethod.rounding ?? null)
    ) {
      return copy.formatMoney(nationalCharge(payUsd, selectedMethod.usdRate, selectedMethod.rounding ?? 2), selectedMethod.currency);
    }
    return copy.formatUsd(payUsd);
  }, [copy, payUsd, selectedMethod]);

  useEffect(() => {
    const openDialog = () => {
      if (!user) return;
      setSelectedMethodId(null);
      setCheckoutError(null);
      setSpendOpen(false);
      setOpen(true);
    };
    window.addEventListener(TOP_UP_EVENT, openDialog);
    return () => window.removeEventListener(TOP_UP_EVENT, openDialog);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void fetch(`/api/balance?locale=${encodeURIComponent(locale)}`, {
      cache: "no-store",
      headers: { [LOCALE_HEADER]: locale },
    }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { paymentMethods?: PaymentMethod[] };
      if (!data.paymentMethods) return;
      setPaymentMethods(data.paymentMethods);
      setSelectedMethodId((current) => current && data.paymentMethods!.some((method) => method.id === current) ? current : null);
    }).catch(() => undefined);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, locale]);

  const selectAmount = (value: number) => {
    setAmountInput(String(value));
    setCheckoutError(null);
  };

  const checkout = async (event: FormEvent) => {
    event.preventDefault();
    if (amountError || !selectedMethodId) return;
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credits, locale, methodId: selectedMethodId }),
      });
      const payload = await response.json().catch(() => null) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) throw new Error(payload?.error || copy.checkoutFailed);
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : copy.checkoutFailed);
      setCheckoutBusy(false);
    }
  };

  const close = () => {
    setSpendOpen(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={t.profile.topUp}>
      <form onSubmit={checkout} className="my-auto w-full max-w-lg rounded-[26px] border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-text">{t.profile.topUp}</h2>
            <p className="mt-1 text-sm text-steel">{copy.topUpHint}</p>
          </div>
          <button type="button" aria-label={copy.close} onClick={close} className="rounded-xl p-2 text-steel hover:bg-mist">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {TOP_UP_CREDIT_PRESETS.map((preset) => {
            const presetDiscount = topUpDiscount(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => selectAmount(preset)}
                className={`rounded-xl border px-3 py-3 font-medium ${credits === preset ? "border-accent-brand bg-mist text-accent-brand" : "border-border text-text hover:bg-mist"}`}
              >
                <span className="block text-[1.5em] leading-none tabular-nums">{preset}<CreditGlyph className="ms-0.5" /></span>
                <span className="mt-1.5 block text-[10px] text-emerald-500">{copy.discountLabel(presetDiscount)}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-5 block text-sm font-medium text-text">
          {copy.customAmount}
          <Input
            aria-invalid={Boolean(amountError)}
            type="number"
            min={MIN_TOP_UP_CREDITS}
            max={MAX_TOP_UP_CREDITS}
            step="1"
            value={amountInput}
            onChange={(event) => { setAmountInput(event.target.value); setCheckoutError(null); }}
            className={`mt-2 ${amountError ? "border-destructive text-destructive focus-visible:ring-destructive/30" : ""}`}
          />
        </label>
        <p className={`mt-1.5 text-xs ${amountError ? "font-medium text-destructive" : "text-steel"}`}>
          {withCreditGlyphs(amountError ?? copy.minimumHintCredits(MIN_TOP_UP_CREDITS))}
        </p>
        <div className="mt-5 rounded-2xl bg-mist p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-steel">{copy.willBeCredited}</span>
            <span className="text-xl font-semibold tabular-nums text-text">{copy.formatUsd(payUsd)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs text-emerald-500">{copy.discountLabel(discount)}</p>
            <button
              type="button"
              onClick={() => setSpendOpen(true)}
              className="shrink-0 text-right text-xs text-accent-brand underline-offset-4 hover:underline"
            >
              {copy.spendHint}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-text">{copy.choosePaymentMethod}</p>
          {paymentMethods.length
            ? (
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={copy.paymentMethodsAria}>
                {paymentMethods.map((method) => (
                  <PaymentBadge
                    key={method.id}
                    selected={selectedMethodId === method.id}
                    onSelect={() => { setSelectedMethodId(method.id); setCheckoutError(null); }}
                    label={method.display_name}
                    icon={method.hasLogo
                      ? <img src={`/api/payment-methods/${method.id}/logo`} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                      : <span className="text-lg font-semibold text-text">{method.display_name.slice(0, 1)}</span>}
                  />
                ))}
              </div>
            )
            : <p className="text-xs text-steel">{copy.moreMethodsEmpty}</p>}
        </div>
        {checkoutError ? <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{checkoutError}</p> : null}
        <Button type="submit" className="mt-4 w-full" disabled={Boolean(amountError) || !selectedMethodId || checkoutBusy}>
          {checkoutBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          {copy.proceedToPayment(payLabel)}
        </Button>
      </form>

      {spendOpen && Number.isFinite(credits) ? <SpendEstimateDialog tokens={credits * 1000} onClose={() => setSpendOpen(false)} /> : null}
    </div>
  );
}

function PaymentBadge({ icon, label, selected, onSelect }: { icon: ReactNode; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center ${selected ? "border-accent-brand bg-mist text-accent-brand" : "border-border bg-surface text-steel hover:bg-mist"}`}
    >
      <span className="grid h-6 place-items-center text-text">{icon}</span>
      <span className="text-[11px] font-medium text-text">{label}</span>
    </button>
  );
}
