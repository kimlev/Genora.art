"use client";

import { ChevronDown, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ModelKind = "text" | "image" | "audio" | "video";
type KindFilter = "all" | ModelKind;
type ModelItem = { id: string; name: string; kind: ModelKind; multiplier: number };
type ProviderItem = { id: string; name: string; multiplier: number; models: number; items: ModelItem[] };
type Data = {
  providers: ProviderItem[];
  history: Array<{
    id: string;
    providerName: string;
    previousMultiplier: number;
    newMultiplier: number;
    affectedModels: number;
    affectedUsers: number;
    usageEvents: number;
    createdAt: string;
    adminEmail: string | null;
  }>;
};

const KIND_ORDER: ModelKind[] = ["text", "image", "audio", "video"];
const KIND_LABEL: Record<ModelKind, string> = { text: "Чаты", image: "Фото", audio: "Песни", video: "Видео" };
const KIND_FILTERS: Array<{ id: KindFilter; label: string }> = [
  { id: "text", label: "Чаты" },
  { id: "image", label: "Фото" },
  { id: "audio", label: "Песни" },
  { id: "video", label: "Видео" },
  { id: "all", label: "Все" },
];

function providerKinds(items: ModelItem[]) {
  return KIND_ORDER.filter((kind) => items.some((item) => item.kind === kind));
}

function parseMultiplier(raw: string): number | null {
  const value = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

function formatMultiplier(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—";
}

function groups(items: ModelItem[]) {
  return KIND_ORDER.map((kind) => ({ kind, label: KIND_LABEL[kind], items: items.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length);
}

export function AdminPricingMultipliers() {
  const [data, setData] = useState<Data | null>(null);
  const [providerValues, setProviderValues] = useState<Record<string, string>>({});
  const [modelValues, setModelValues] = useState<Record<string, string>>({});
  const [globalValue, setGlobalValue] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/pricing-multipliers", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить множители");
    const next = await response.json() as Data;
    setData(next);
    setProviderValues(Object.fromEntries(next.providers.map((item) => [item.id, String(item.multiplier)])));
    setModelValues(Object.fromEntries(next.providers.flatMap((provider) => provider.items.map((item) => [item.id, String(item.multiplier)]))));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((error) => setMessage(error instanceof Error ? error.message : "Ошибка")), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const changed = useMemo(() => {
    if (!data) return false;
    return data.providers.some((provider) => (parseMultiplier(providerValues[provider.id] ?? "") ?? provider.multiplier) !== provider.multiplier)
      || data.providers.some((provider) => provider.items.some((item) => (parseMultiplier(modelValues[item.id] ?? "") ?? item.multiplier) !== item.multiplier));
  }, [data, modelValues, providerValues]);

  const applyToModels = (providerId: string, raw: string) => {
    const provider = data?.providers.find((item) => item.id === providerId);
    const value = parseMultiplier(raw);
    if (!provider || value === null) return;
    const text = String(value);
    setModelValues((current) => ({
      ...current,
      ...Object.fromEntries(provider.items.map((item) => [item.id, text])),
    }));
  };

  const applyGlobal = (raw: string) => {
    setGlobalValue(raw);
    const value = parseMultiplier(raw);
    if (!data || value === null) return;
    const text = String(value);
    setProviderValues(Object.fromEntries(data.providers.map((provider) => [provider.id, text])));
    setModelValues(Object.fromEntries(data.providers.flatMap((provider) => provider.items.map((item) => [item.id, text]))));
    setMessage("Общий множитель подставлен всем провайдерам и моделям. Для применения нажмите «Сохранить».");
  };

  const applyProvider = (providerId: string, raw: string) => {
    setProviderValues((current) => ({ ...current, [providerId]: raw }));
    applyToModels(providerId, raw);
  };

  const save = async () => {
    if (!data || !changed) return;
    setBusy(true);
    setMessage(null);
    try {
      const providers = Object.fromEntries(
        data.providers
          .map((item) => [item.id, parseMultiplier(providerValues[item.id] ?? "")] as const)
          .filter((entry): entry is readonly [string, number] => entry[1] !== null && entry[1] !== data.providers.find((item) => item.id === entry[0])?.multiplier),
      );
      const afterProvider = new Map(data.providers.map((provider) => [
        provider.id,
        providers[provider.id] ?? provider.multiplier,
      ]));
      const models = data.providers.flatMap((provider) => provider.items
        .map((item) => ({ item, next: parseMultiplier(modelValues[item.id] ?? "") }))
        .filter(({ item, next }) => next !== null && next !== item.multiplier && next !== afterProvider.get(provider.id))
        .map(({ item, next }) => ({ id: item.id, providerId: provider.id, multiplier: next as number })));
      const response = await fetch("/api/admin/pricing-multipliers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providers, models }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; synced?: { providers: number; models: number } } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Ошибка сохранения");
      await load();
      setGlobalValue("");
      setMessage(`Сохранено. Публичный прайс обновлён: ${payload?.synced?.providers ?? 0} провайдеров, ${payload?.synced?.models ?? 0} моделей.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const visibleProviders = useMemo(() => {
    if (!data) return [];
    if (kindFilter === "all") return data.providers;
    return data.providers.filter((provider) => provider.items.some((item) => item.kind === kindFilter));
  }, [data, kindFilter]);

  if (!data) return <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-steel">{message ?? "Загрузка…"}</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-steel">
            Общий множитель (0–100)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={globalValue}
              onChange={(event) => applyGlobal(event.target.value)}
              className="h-10 rounded-xl border border-border bg-bg px-3 text-text"
            />
          </label>
          <button disabled={busy || !changed} onClick={() => void save()} className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white disabled:opacity-35">
            <Save className="size-4" />Сохранить
          </button>
        </div>
        {message ? <p className="mt-3 text-xs text-steel" role="status">{message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKindFilter(item.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              kindFilter === item.id
                ? "border-accent-brand bg-accent-brand text-white"
                : "border-border bg-surface text-steel hover:bg-mist",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleProviders.map((provider) => {
          const expanded = Boolean(open[provider.id]);
          const modelGroups = groups(provider.items);
          const kinds = providerKinds(provider.items);
          return (
            <div key={provider.id} className="rounded-2xl border border-border bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setOpen((current) => ({ ...current, [provider.id]: !current[provider.id] }))}
                  className="flex min-w-0 flex-1 items-start gap-2 pt-5 text-left"
                >
                  <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-steel transition-transform", expanded && "rotate-180")} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text">{provider.name}</span>
                      <span className="text-xs text-steel">{provider.items.length} моделей</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-text">{formatMultiplier(provider.multiplier)}</span>
                    </span>
                    {kinds.length ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {kinds.map((kind) => (
                          <span key={kind} className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-steel">{KIND_LABEL[kind]}</span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
                <div className="grid shrink-0 justify-items-end gap-1">
                  <label className="grid justify-items-end gap-1 text-[11px] text-steel">
                    Множитель провайдера
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={providerValues[provider.id] ?? ""}
                      onChange={(event) => applyProvider(provider.id, event.target.value)}
                      className="h-10 w-32 rounded-xl border border-border bg-bg px-3 text-right text-sm text-text"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !provider.items.length}
                    onClick={() => applyToModels(provider.id, providerValues[provider.id] ?? "")}
                    className="text-xs text-sky-600 hover:text-sky-700 disabled:opacity-40"
                  >
                    Применить ко всем
                  </button>
                </div>
              </div>
              {expanded ? (
                <div className="space-y-4 border-t border-border px-4 py-4">
                  {modelGroups.length ? modelGroups.map((group) => (
                    <section key={group.kind} className="space-y-2">
                      <div className="flex items-end justify-between gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">{group.label}</h3>
                        <span className="w-24 text-right text-[11px] text-steel">Множитель</span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <label key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2">
                            <span className="min-w-0 truncate text-sm text-text">{item.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-steel">{formatMultiplier(item.multiplier)}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={modelValues[item.id] ?? ""}
                              onChange={(event) => setModelValues((current) => ({ ...current, [item.id]: event.target.value }))}
                              className="h-9 w-24 shrink-0 rounded-lg border border-border bg-surface px-2 text-right text-sm text-text"
                            />
                          </label>
                        ))}
                      </div>
                    </section>
                  )) : <p className="text-xs text-steel">У этого провайдера пока нет моделей в каталоге.</p>}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="text-left text-steel">
              <th className="p-3">Дата</th>
              <th className="p-3">Провайдер</th>
              <th className="p-3">Изменение</th>
              <th className="p-3">Моделей</th>
              <th className="p-3">Пользователей</th>
              <th className="p-3">Запросов</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((item) => (
              <tr key={item.id} className="border-t border-border text-text">
                <td className="p-3">{new Date(item.createdAt).toLocaleString("ru-RU")}</td>
                <td className="p-3">{item.providerName}</td>
                <td className="p-3">{item.previousMultiplier} → {item.newMultiplier}</td>
                <td className="p-3">{item.affectedModels}</td>
                <td className="p-3">{item.affectedUsers}</td>
                <td className="p-3">{item.usageEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
