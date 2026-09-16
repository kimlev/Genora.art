"use client";

import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { Button } from "@/components/ui/button";
import { DateRangeField } from "@/components/ui/date-range-field";
import { SelectMenu } from "@/components/ui/select-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { roundSpendTokens } from "@/lib/credits";
import { profileUiCopy } from "@/lib/i18n/copy/profile-ui";
import { displayUsageAgent, usageKindFromId, type UsageKind } from "@/lib/usage-kind";
import { refreshUsageHistory, useUsageHistory } from "@/lib/usage-history";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type UsageRow = {
  id: string;
  date: string;
  time: string;
  kind: UsageKind;
  category: string;
  deleted: boolean;
  failed: boolean;
  model: string;
  agent: string;
  input: number;
  output: number;
  billed: number;
};

type Grouping = "day" | "week" | "month";
type UsageFilters = { from: string; to: string; type: "all" | UsageKind; model: string };

function localIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function last30Days(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: localIsoDate(from), to: localIsoDate(to) };
}

function groupKey(date: string, grouping: Grouping): string {
  if (grouping === "day") return date;
  if (grouping === "month") return date.slice(0, 7);
  const current = new Date(`${date}T00:00:00Z`);
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  return current.toISOString().slice(0, 10);
}

function FilterField({
  label,
  clearLabel,
  value,
  options,
  onChange,
  onClear,
  canClear,
}: {
  label: string;
  clearLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  return (
    <div className="flex min-w-48 flex-1 items-end gap-1">
      <div className="grid min-w-0 flex-1 gap-1 text-xs font-medium uppercase tracking-wide text-steel">
        {label}
        <SelectMenu
          ariaLabel={label}
          value={value}
          options={options}
          onChange={onChange}
          className="normal-case tracking-normal"
        />
      </div>
      <button
        type="button"
        aria-label={clearLabel}
        title={clearLabel}
        disabled={!canClear}
        onClick={onClear}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-steel hover:bg-mist hover:text-text disabled:cursor-default disabled:opacity-30"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ProfileUsage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const copy = useMemo(() => profileUiCopy(locale), [locale]);
  const { user } = useAuth();
  const history = useUsageHistory(user?.email ?? null);
  const categoryLabel = useMemo(() => ({
    chat: copy.typeChat,
    image: copy.typeImage,
    video: copy.typeVideo,
    song: copy.typeSong,
  }), [copy]);
  const rows = useMemo<UsageRow[]>(() => history.map((entry) => {
    const timestamp = new Date(entry.timestamp);
    const kind = usageKindFromId(entry.id);
    return {
      id: entry.id,
      date: timestamp.toISOString().slice(0, 10),
      time: copy.formatTime(timestamp),
      kind,
      category: categoryLabel[kind],
      deleted: Boolean(entry.chatDeleted),
      failed: Boolean(entry.failed),
      model: entry.model,
      agent: displayUsageAgent(entry.agent),
      input: entry.inputTokens,
      output: entry.outputTokens,
      billed: roundSpendTokens(entry.billedTokens),
    };
  }), [categoryLabel, copy, history]);
  const [draftFrom, setDraftFrom] = useState(() => last30Days().from);
  const [draftTo, setDraftTo] = useState(() => last30Days().to);
  const [draftType, setDraftType] = useState<"all" | UsageKind>("all");
  const [draftModel, setDraftModel] = useState("all");
  const [filters, setFilters] = useState<UsageFilters>(() => ({ ...last30Days(), type: "all", model: "all" }));
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!draftFrom || !draftTo) return;
    const from = draftFrom <= draftTo ? draftFrom : draftTo;
    const to = draftFrom <= draftTo ? draftTo : draftFrom;
    setFilters((current) => (
      current.from === from && current.to === to ? current : { ...current, from, to }
    ));
  }, [draftFrom, draftTo]);

  const visible = useMemo(() => rows.filter((row) => (
    row.date >= filters.from
    && row.date <= filters.to
    && (filters.type === "all" || row.kind === filters.type)
    && (filters.model === "all" || row.model === filters.model)
  )), [filters, rows]);
  const totals = useMemo(() => visible.reduce((sum, row) => ({ input: sum.input + row.input, output: sum.output + row.output, billed: sum.billed + row.billed }), { input: 0, output: 0, billed: 0 }), [visible]);
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();
    visible.forEach((row) => {
      const key = groupKey(row.date, grouping);
      grouped.set(key, (grouped.get(key) ?? 0) + row.billed);
    });
    const label = (key: string) => {
      if (grouping === "day") return copy.formatDay(key);
      if (grouping === "week") return copy.weekFrom(key);
      return copy.formatMonth(key);
    };
    return Array.from(grouped, ([key, total]) => ({ key, total, label: label(key) })).sort((left, right) => left.key.localeCompare(right.key));
  }, [copy, grouping, visible]);
  const chartMax = Math.max(...chartData.map((item) => item.total), 1);
  const models = useMemo(() => {
    const pool = draftType === "all" ? rows : rows.filter((row) => row.kind === draftType);
    return Array.from(new Set(pool.map((row) => row.model))).sort();
  }, [draftType, rows]);

  const applyFilters = async () => {
    const range = draftFrom && draftTo
      ? { from: draftFrom <= draftTo ? draftFrom : draftTo, to: draftFrom <= draftTo ? draftTo : draftFrom }
      : { from: filters.from, to: filters.to };
    if (draftFrom && draftTo) {
      setDraftFrom(range.from);
      setDraftTo(range.to);
    }
    setFilters({ ...range, type: draftType, model: draftModel });
    setRefreshing(true);
    try {
      if (user?.email) await refreshUsageHistory(user.email).catch(() => undefined);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const clearType = () => {
    setDraftType("all");
    setFilters((current) => ({ ...current, type: "all" }));
  };

  const clearModel = () => {
    setDraftModel("all");
    setFilters((current) => ({ ...current, model: "all" }));
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t.profile.usageTitle}</h1>
        <DateRangeField from={draftFrom} to={draftTo} onFrom={setDraftFrom} onTo={setDraftTo} hideLabel align="end" />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-steel">{t.profile.usageSubtitle}</p>

      <div className="mt-7 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-medium text-text">{copy.chartTitle}</h2><p className="mt-1 text-xs text-steel">{copy.chartSubtitle}</p></div>
          <div className="flex items-center gap-2 text-xs font-medium text-steel">
            {copy.grouping}
            <SelectMenu
              ariaLabel={copy.grouping}
              value={grouping}
              options={[
                { value: "day", label: copy.groupingDay },
                { value: "week", label: copy.groupingWeek },
                { value: "month", label: copy.groupingMonth },
              ]}
              onChange={(next) => setGrouping(next as Grouping)}
              className="w-40"
            />
          </div>
        </div>
        {chartData.length ? (
          <div className="mt-6 grid h-56 grid-flow-col auto-cols-fr items-end gap-2 border-b border-border px-1 pt-8" aria-label={copy.chartAria}>
            {chartData.map((item) => <div key={item.key} className="flex h-full min-w-0 flex-col justify-end text-center"><span className="mb-1 truncate text-[10px] tabular-nums text-steel" title={copy.tokensAmount(item.total)}>{withCreditGlyphs(copy.tokensAmount(item.total))}</span><div className="mx-auto w-full max-w-14 rounded-t-lg bg-accent-brand/80 transition-[height]" style={{ height: `${Math.max(8, (item.total / chartMax) * 100)}%` }} /><span className="mt-2 truncate text-[10px] text-steel">{item.label}</span></div>)}
          </div>
        ) : <div className="grid h-56 place-items-center text-sm text-steel">{copy.emptyPeriod}</div>}
      </div>

      <div className="mt-5"><div className="rounded-2xl border border-accent-brand/30 bg-accent-brand/5 p-4"><p className="text-xs text-steel">{copy.totalBilled}</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{withCreditGlyphs(copy.tokensAmount(totals.billed))}</p></div></div>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-mist/45 p-4">
        <FilterField
          label={copy.typeLabel}
          clearLabel={copy.clearFilter}
          value={draftType}
          options={[
            { value: "all", label: copy.allTypes },
            { value: "chat", label: copy.typeChat },
            { value: "image", label: copy.typeImage },
            { value: "video", label: copy.typeVideo },
            { value: "song", label: copy.typeSong },
          ]}
          onChange={(next) => {
            const type = next as "all" | UsageKind;
            setDraftType(type);
            setDraftModel("all");
          }}
          onClear={clearType}
          canClear={draftType !== "all" || filters.type !== "all"}
        />
        <FilterField
          label={copy.modelLabel}
          clearLabel={copy.clearFilter}
          value={draftModel}
          options={[{ value: "all", label: copy.allModels }, ...models.map((item) => ({ value: item, label: item }))]}
          onChange={setDraftModel}
          onClear={clearModel}
          canClear={draftModel !== "all" || filters.model !== "all"}
        />
        <Button type="button" className="sm:ml-auto" disabled={refreshing} onClick={() => void applyFilters()}>{copy.applyFilter}</Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full table-fixed text-[11px] sm:text-xs">
          <colgroup><col className="w-[16%]" /><col className="w-[22%]" /><col className="w-[24%]" /><col className="w-[22%]" /><col className="w-[16%]" /></colgroup>
          <thead><tr className="border-b border-border bg-mist/55 text-left text-[10px] uppercase tracking-wide text-steel"><th className="px-2 py-3 font-medium">{copy.colDate}</th><th className="px-2 py-3 font-medium">{copy.colChat}</th><th className="px-2 py-3 font-medium">{copy.modelLabel}</th><th className="px-2 py-3 font-medium">{copy.colAgent}</th><th className="px-2 py-3 text-right font-medium">{copy.colBilled}</th></tr></thead>
          <tbody>{visible.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><td className={cn("px-2 py-3", row.failed ? "text-destructive" : "text-steel")}><span className="block">{copy.formatDay(row.date)}</span><span className="block tabular-nums">{row.time}</span></td><td className={cn("px-2 py-3", row.failed ? "font-medium text-destructive" : "text-text")}><span className="line-clamp-2 break-words">{row.category}</span>{row.deleted ? <span className="mt-0.5 block text-[10px] font-medium text-destructive">{copy.chatDeleted}</span> : null}</td><td className={cn("px-2 py-3", row.failed ? "font-medium text-destructive" : "text-text")}><span className="line-clamp-2 break-words">{row.model}</span></td><td className={cn("px-2 py-3", row.failed ? "text-destructive" : "text-steel")}><span className="line-clamp-2 break-words">{row.agent}</span></td><td className={cn("px-2 py-3 text-right font-medium tabular-nums", row.failed ? "text-destructive" : "text-text")}>{withCreditGlyphs(copy.tokensAmount(row.billed))}</td></tr>)}</tbody>
        </table>
        {!visible.length ? <p className="p-8 text-center text-sm text-steel">{copy.emptyPeriod}</p> : null}
      </div>
      <p className="mt-3 text-xs text-steel">{copy.footer(visible.length, filters.from, filters.to)}</p>
    </section>
  );
}
