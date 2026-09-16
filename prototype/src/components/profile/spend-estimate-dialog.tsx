"use client";

import { useCatalog } from "@/components/providers/catalog-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { profileUiCopy } from "@/lib/i18n/copy/profile-ui";
import { spendEnoughCopy } from "@/lib/i18n/copy/spend-enough-copy";
import { IS_STAGING } from "@/lib/site-env";
import { estimateFromDailyRates, estimateTokenSpend } from "@/lib/token-spend-estimate";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DailyRates = { textTokens: number; imageTokens: number; songTokens: number; videoTokens: number };

export function SpendEstimateDialog({ tokens, onClose }: { tokens: number; onClose: () => void }) {
  const { locale } = useLocale();
  const copy = useMemo(() => profileUiCopy(locale), [locale]);
  const enough = useMemo(() => spendEnoughCopy(locale), [locale]);
  const { models } = useCatalog();
  const [imagePrices, setImagePrices] = useState<Array<Record<string, number>>>([]);
  const [dailyRates, setDailyRates] = useState<DailyRates | null>(null);
  const spend = useMemo(() => estimateTokenSpend(tokens, models, imagePrices), [imagePrices, models, tokens]);
  const averageSpend = useMemo(
    () => estimateFromDailyRates(tokens, dailyRates?.textTokens ?? 0, dailyRates?.imageTokens ?? 0, dailyRates?.songTokens ?? 0, dailyRates?.videoTokens ?? 0),
    [dailyRates, tokens],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (IS_STAGING) {
      void fetch("/api/spend-enough", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: DailyRates | null) => {
          if (data) setDailyRates({
            textTokens: Number(data.textTokens) || 0,
            imageTokens: Number(data.imageTokens) || 0,
            songTokens: Number(data.songTokens) || 0,
            videoTokens: Number(data.videoTokens) || 0,
          });
        })
        .catch(() => undefined);
    } else {
      void fetch("/api/images/catalog", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { models?: Array<{ token_prices?: Record<string, number> }> };
        setImagePrices((data.models ?? []).map((model) => model.token_prices ?? {}));
      }).catch(() => undefined);
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={IS_STAGING ? enough.title : copy.spendTitle}>
      <div className="w-full max-w-md rounded-[26px] border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className={IS_STAGING ? "text-xl font-bold text-accent-brand" : "text-xl font-semibold text-text"}>{IS_STAGING ? enough.title : copy.spendTitle}</h3>
          <button type="button" aria-label={copy.close} onClick={onClose} className="rounded-xl p-2 text-steel hover:bg-mist">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-steel">{IS_STAGING ? enough.note : copy.spendNote}</p>
        <div className="mt-5 space-y-4 text-sm">
          {IS_STAGING ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text">{enough.textRequests}</p>
                <span className="tabular-nums text-text">{copy.spendCount(averageSpend.text)}</span>
              </div>
              <p className="text-[11px] leading-none text-steel">{enough.or}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text">{enough.images}</p>
                <span className="tabular-nums text-text">{copy.spendCount(averageSpend.images)}</span>
              </div>
              <p className="text-[11px] leading-none text-steel">{enough.or}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text">{enough.videos}</p>
                <span className="tabular-nums text-text">{copy.spendCount(averageSpend.videos)}</span>
              </div>
              <p className="text-[11px] leading-none text-steel">{enough.or}</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text">{enough.songs}</p>
                <span className="tabular-nums text-text">{copy.spendCount(averageSpend.songs)}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-medium text-text">{copy.spendTextRequests}</p>
                <SpendRow label={copy.spendHeavy} value={copy.spendCount(spend.text.heavy)} />
                <SpendRow label={copy.spendMedium} value={copy.spendCount(spend.text.medium)} />
                <SpendRow label={copy.spendLight} value={copy.spendCount(spend.text.light)} />
              </div>
              <div>
                <p className="font-medium text-text">{copy.spendImages}</p>
                <SpendRow label={copy.spendQuality2k} value={copy.spendCount(spend.images.quality2k)} />
                <SpendRow label={copy.spendQuality1k} value={copy.spendCount(spend.images.quality1k)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SpendRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1.5 flex items-center justify-between gap-3 text-steel">
      <span>{label}</span>
      <span className="tabular-nums text-text">{value}</span>
    </div>
  );
}
