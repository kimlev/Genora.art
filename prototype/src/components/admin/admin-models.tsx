"use client";

import { filterAdminModels, MODEL_KIND_LABEL, summarizeAdminModels, type AdminModelKind, type AdminModelRow } from "@/lib/admin-models";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { AdminSelect } from "./admin-select";
import { money, number, td, th } from "./admin-types";

type Data = {
  rows: AdminModelRow[];
  providers: Array<{ id: string; name: string }>;
  models: Array<{ id: string; name: string; providerId: string; kind: AdminModelKind }>;
};

export function AdminModels() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftProvider, setDraftProvider] = useState("");
  const [draftModel, setDraftModel] = useState("");
  const [draftKind, setDraftKind] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [kind, setKind] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/models", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json().catch(() => null) as (Data & { error?: string }) | null;
          if (!response.ok || !payload) throw new Error(payload?.error ?? "Не удалось загрузить модели");
          setData(payload);
        })
        .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Ошибка"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const modelOptions = useMemo(() => {
    const items = (data?.models ?? []).filter((item) => (
      (!draftProvider || item.providerId === draftProvider) && (!draftKind || item.kind === draftKind)
    ));
    return items.map((item) => ({ value: item.id, label: item.name }));
  }, [data, draftKind, draftProvider]);

  const visible = useMemo(() => filterAdminModels(data?.rows ?? [], provider, model, kind), [data, kind, model, provider]);
  const summary = useMemo(() => summarizeAdminModels(visible), [visible]);

  const apply = () => {
    setProvider(draftProvider);
    setModel(draftModel);
    setKind(draftKind);
  };

  if (!data) return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">{error ?? "Загрузка…"}</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <AdminSelect
            label="Провайдер"
            value={draftProvider}
            options={(data.providers ?? []).map((item) => ({ value: item.id, label: item.name }))}
            emptyLabel="Все провайдеры"
            onChange={(next) => {
              setDraftProvider(next);
              if (draftModel && !(data.models ?? []).some((item) => item.id === draftModel && item.providerId === next)) {
                setDraftModel("");
              }
            }}
            className="min-w-64"
          />
          <AdminSelect
            label="Модель"
            value={draftModel}
            options={modelOptions}
            emptyLabel="Все модели"
            onChange={setDraftModel}
            className="min-w-72"
          />
          <AdminSelect
            label="Тип"
            value={draftKind}
            options={(Object.keys(MODEL_KIND_LABEL) as AdminModelKind[]).map((item) => ({ value: item, label: MODEL_KIND_LABEL[item] }))}
            emptyLabel="Все типы"
            onChange={(next) => {
              setDraftKind(next);
              if (draftModel && !(data.models ?? []).some((item) => item.id === draftModel && (!next || item.kind === next))) {
                setDraftModel("");
              }
            }}
            className="min-w-48"
          />
          <button type="button" onClick={apply} className="ml-auto inline-flex h-10 items-center rounded-xl bg-orange-500 px-5 text-xs font-semibold text-white">
            Применить
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Моделей" value={number(summary.models)} />
        <Metric label="Средняя цена" value={money(summary.averagePrice)} />
        <Metric label="Доход" value={money(summary.revenueUsd)} accent="text-emerald-400" />
        <Metric label="Расход" value={money(summary.costUsd)} accent="text-amber-400" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Провайдер</th>
              <th className={th}>Модель</th>
              <th className={th}>Тип</th>
              <th className={th}>Средняя цена 1 запроса, USD</th>
              <th className={th}>Доход</th>
              <th className={th}>Расход</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.modelId}>
                <td className={td}>{row.provider}</td>
                <td className={td}><b>{row.model}</b></td>
                <td className={td}>{row.kindLabel}</td>
                <td className={td}>{row.averageRequestCostUsd == null ? "—" : money(row.averageRequestCostUsd)}</td>
                <td className={td}>{money(row.revenueUsd)}</td>
                <td className={td}>{money(row.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? <p className="p-8 text-center text-sm text-slate-500">Нет моделей по выбранным фильтрам</p> : null}
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold text-slate-100", accent)}>{value}</p>
    </div>
  );
}
