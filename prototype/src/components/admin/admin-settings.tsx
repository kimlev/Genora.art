"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Loader2 } from "lucide-react";
import { IS_STAGING } from "@/lib/site-env";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { ProviderLogo } from "@/components/chat/provider-logo";
import { DEFAULT_WELCOME_BONUS_CONFIG, WELCOME_BONUS_TASKS, formatWelcomeTokens, welcomeBonusTotal, type WelcomeBonusConfig } from "@/lib/welcome-bonus";
import { MAX_REGISTRATION_BONUS_THOUSANDS, MIN_REGISTRATION_BONUS_THOUSANDS } from "@/lib/site-settings";
import { AdminAgents } from "./admin-agents";
import { AdminDateRange } from "./admin-date-range";
import { AdminSelect } from "./admin-select";

const TASK_LABELS: Record<string, string> = {
  login: "Заходи несколько дней подряд",
  texts: "Текстовые запросы",
  images: "Картинки",
  tracks: "Треки",
  friends: "Приглашения друзей",
};

function tokensToK(tokens: number): string {
  return String(Math.round(tokens / 1000));
}

function kToTokens(value: string): number {
  const thousands = Number(value);
  return Number.isFinite(thousands) ? Math.round(thousands * 1000) : 0;
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-2 px-5 py-4 text-left">
        {open ? <ChevronDown className="size-4 shrink-0 text-slate-500" /> : <ChevronRight className="size-4 shrink-0 text-slate-500" />}
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="ms-auto text-xs text-slate-500">{open ? "Свернуть" : "Развернуть"}</span>
      </button>
      {open ? <div className="border-t border-slate-200 px-5 py-5 dark:border-slate-800">{children}</div> : null}
    </div>
  );
}

export function AdminSettings({ page }: { page: "marketing" | "requests" | "agents" }) {
  if (page === "requests") return <AdminRequests />;
  if (page === "agents") return <AdminAgents />;
  return (
    <div className="space-y-3">
      <SettingsSection title="Бонус за регистрацию">
        <RegistrationBonusSettings />
      </SettingsSection>
      {IS_STAGING ? (
        <SettingsSection title="Приветственный бонус">
          <WelcomeBonusSettings />
        </SettingsSection>
      ) : null}
    </div>
  );
}

function RegistrationBonusSettings() {
  const [thousands, setThousands] = useState("20");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { registrationBonusThousands?: number } | null) => {
        if (active && data?.registrationBonusThousands != null) setThousands(String(data.registrationBonusThousands));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registrationBonusThousands: Number(thousands) }),
    });
    const data = await response.json().catch(() => null) as { error?: string; registrationBonusThousands?: number } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось сохранить");
    else {
      if (data?.registrationBonusThousands) setThousands(String(data.registrationBonusThousands));
      setMessage("Сохранено. На сайте значение обновится сразу.");
    }
    setSaving(false);
  };

  if (loading) return <div className="grid min-h-24 place-items-center"><Loader2 className="size-6 animate-spin text-blue-400" /></div>;

  return (
    <div className="max-w-xl">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Бонус за регистрацию</p>
      <p className="mt-1 text-xs font-normal text-slate-500">Укажите значение в тысячах токенов (K). Сейчас на сайте гости видят этот бонус, а при регистрации он начисляется в баланс.</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={MIN_REGISTRATION_BONUS_THOUSANDS}
          max={MAX_REGISTRATION_BONUS_THOUSANDS}
          step={1}
          value={thousands}
          onChange={(event) => setThousands(event.target.value)}
          className="h-11 w-32 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-sm text-slate-600 dark:text-slate-400">K токенов</span>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Сохранить
      </button>
      {message ? <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">{message}</p> : null}
    </div>
  );
}

function WelcomeBonusSettings() {
  const [config, setConfig] = useState<WelcomeBonusConfig>(DEFAULT_WELCOME_BONUS_CONFIG);
  const [logs, setLogs] = useState<Array<{ version: number; admin_email: string; changes: { from?: WelcomeBonusConfig; to?: WelcomeBonusConfig }; created_at: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/welcome-bonus", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { config?: WelcomeBonusConfig; logs?: Array<{ version: number; admin_email: string; changes: { from?: WelcomeBonusConfig; to?: WelcomeBonusConfig }; created_at: string }> } | null) => {
        if (data?.config) setConfig(data.config);
        if (data?.logs) setLogs(data.logs);
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/welcome-bonus", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const data = await response.json().catch(() => null) as { error?: string; config?: WelcomeBonusConfig } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось сохранить");
    else {
      if (data?.config) setConfig(data.config);
      setMessage("Сохранено. Новые пользователи получат эту версию, текущие акции не меняются.");
      const logsResponse = await fetch("/api/admin/welcome-bonus", { cache: "no-store" });
      const logsData = await logsResponse.json().catch(() => null) as { logs?: typeof logs } | null;
      if (logsData?.logs) setLogs(logsData.logs);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-xl">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Приветственный бонус</h3>
      <p className="mt-1 text-xs text-slate-500">Для каждого задания укажите максимум токенов и сколько действий нужно выполнить. Сумма показывается гостю и в окне заданий.</p>
      <div className="mt-4 space-y-3">
        {WELCOME_BONUS_TASKS.map((task) => (
          <div key={task} className="grid grid-cols-[1fr_7rem_7rem] items-end gap-2">
            <p className="text-sm text-slate-800 dark:text-slate-200">{TASK_LABELS[task]}</p>
            <label className="text-[11px] text-slate-500">макс бонус, К
              <input type="number" min={0} value={tokensToK(config[task].maxBonus)} onChange={(event) => setConfig({ ...config, [task]: { ...config[task], maxBonus: kToTokens(event.target.value) } })} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="text-[11px] text-slate-500">Действия
              <input type="number" min={1} value={config[task].required} onChange={(event) => setConfig({ ...config, [task]: { ...config[task], required: Number(event.target.value) } })} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Сумма: {withCreditGlyphs(formatWelcomeTokens(welcomeBonusTotal(config)))}</p>
      <button type="button" disabled={saving} onClick={() => void save()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Сохранить
      </button>
      {message ? <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">{message}</p> : null}
      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Логи изменений</p>
        {logs.length === 0 ? <p className="text-xs text-slate-500">Пока нет записей</p> : logs.map((log) => (
          <div key={`${log.version}-${log.created_at}`} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <p>{new Date(log.created_at).toLocaleString("ru-RU")} · {log.admin_email} · версия {log.version}</p>
            <p className="mt-1">Сумма {withCreditGlyphs(formatWelcomeTokens(welcomeBonusTotal(log.changes.from ?? DEFAULT_WELCOME_BONUS_CONFIG)))} → {withCreditGlyphs(formatWelcomeTokens(welcomeBonusTotal(log.changes.to ?? config)))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type AdminRequest = {
  id: string;
  createdAt: string;
  answeredAt: string | null;
  email: string;
  type: string;
  model: string | null;
  agent: string | null;
  provider: string | null;
  costUsd: number;
  status: "success" | "running" | "error";
};

const TYPE_LABELS: Record<string, string> = { chat: "текст", image: "изображение", video: "видео", music: "песня" };
const STATUS_LABELS: Record<AdminRequest["status"], string> = { success: "успех", running: "выполняется", error: "ошибка" };
const STATUS_PILL: Record<AdminRequest["status"], string> = {
  success: "bg-emerald-100 text-emerald-800",
  running: "bg-blue-100 text-blue-800",
  error: "bg-rose-100 text-rose-800",
};
const STATUS_SWATCH: Record<AdminRequest["status"], string> = {
  success: "bg-emerald-500",
  running: "bg-blue-500",
  error: "bg-rose-500",
};
function lastThreeDays() {
  const to = new Date();
  const from = new Date(Date.now() - 2 * 86400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ShortRequestId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
      <span>{id.slice(0, 4)}</span>
      <button
        type="button"
        aria-label="Копировать ID"
        title={copied ? "Скопировано" : "Копировать полный ID"}
        onClick={() => {
          void navigator.clipboard.writeText(id).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }).catch(() => undefined);
        }}
        className={copied
          ? "rounded bg-emerald-50 p-0.5 text-emerald-600"
          : "rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

function AdminRequests() {
  const [from, setFrom] = useState(() => lastThreeDays().from);
  const [to, setTo] = useState(() => lastThreeDays().to);
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminRequest[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [models, setModels] = useState<Array<{ label: string; provider: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = items.some((item) => item.status === "running");
  const timer = useRef<number | null>(null);
  const filtersRef = useRef({ from, to, userId, type, model, status });
  filtersRef.current = { from, to, userId, type, model, status };

  const load = async (next = filtersRef.current) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: next.from, to: next.to });
    if (next.userId) params.set("userId", next.userId);
    if (next.type) params.set("type", next.type);
    if (next.model) params.set("model", next.model);
    if (next.status) params.set("status", next.status);
    const response = await fetch(`/api/admin/requests?${params}`, { cache: "no-store" });
    const data = await response.json().catch(() => null) as {
      items?: AdminRequest[];
      users?: Array<{ id: string; email: string }>;
      models?: Array<{ label: string; provider: string | null }>;
      error?: string;
    } | null;
    if (!response.ok) setError(data?.error ?? "Не удалось загрузить запросы");
    else {
      setItems(data?.items ?? []);
      if (data?.users) setUsers(data.users);
      if (data?.models?.length) {
        setModels((current) => {
          const next = new Map(current.map((item) => [item.label, item]));
          for (const item of data.models ?? []) next.set(item.label, item);
          return [...next.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"));
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    if (!running) return;
    timer.current = window.setInterval(() => { void load(); }, 2000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [running, from, to, userId, type, model, status]);

  const resetPeriod = () => {
    const period = lastThreeDays();
    setFrom(period.from);
    setTo(period.to);
  };

  const statusesInTable = useMemo(() => {
    const seen = new Set(items.map((item) => item.status));
    return (["success", "running", "error"] as const).filter((item) => seen.has(item) || item === status);
  }, [items, status]);

  const modelOptions = useMemo(
    () => models.map((item) => ({
      value: item.label,
      label: item.label,
      icon: <ProviderLogo provider={item.provider || item.label} className="size-5" />,
    })),
    [models],
  );

  return (
    <div>
      <p className="text-xs text-slate-500">Все обращения к моделям: статус, время и себестоимость Integrator.</p>
      <div className="mt-4">
        <AdminDateRange
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          onApply={() => void load()}
          onClear={resetPeriod}
          loading={loading}
          nowrap
          filters={(
            <>
              <AdminSelect label="Пользователь" value={userId} options={users.map((user) => ({ value: user.id, label: user.email }))} emptyLabel="Все" onChange={setUserId} className="min-w-0 w-40" />
              <AdminSelect label="Тип" value={type} options={[{ value: "chat", label: "текст" }, { value: "image", label: "изображение" }, { value: "video", label: "видео" }, { value: "music", label: "песня" }]} emptyLabel="Все" onChange={setType} className="min-w-0 w-32" />
              <AdminSelect label="Модель" value={model} options={modelOptions} emptyLabel="Все" onChange={setModel} className="min-w-0 w-36" />
              <AdminSelect
                label="Статус"
                value={status}
                options={statusesInTable.map((item) => ({ value: item, label: STATUS_LABELS[item], swatch: STATUS_SWATCH[item] }))}
                emptyLabel="Все"
                onChange={setStatus}
                className="min-w-0 w-32"
              />
            </>
          )}
        />
      </div>
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">ID запроса</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Время запроса</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Ответ / опрос</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Пользователь</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Тип</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Модель</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Агент</th>
              <th className="border-b border-slate-200 py-2 pr-3 dark:border-slate-800">Себестоимость</th>
              <th className="border-b border-slate-200 py-2 dark:border-slate-800">Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((item) => (
              <tr key={item.id} className="text-slate-800 dark:text-slate-200">
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800"><ShortRequestId id={item.id} /></td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{formatDateTime(item.createdAt)}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{formatDateTime(item.answeredAt)}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{item.email}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{TYPE_LABELS[item.type] ?? item.type}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{item.model || "—"}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{item.agent || "—"}</td>
                <td className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">{item.costUsd.toFixed(4)}</td>
                <td className="border-b border-slate-100 py-2 dark:border-slate-800">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                </td>
              </tr>
            )) : (
              <tr><td className="py-4 text-slate-500" colSpan={9}>{loading ? "Загрузка…" : "За выбранный период запросов нет"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
