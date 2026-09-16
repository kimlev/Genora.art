"use client";

import { countryFlag, countryName } from "@/lib/geo/countries";
import { fxRoundingLabel, stepFxRounding } from "@/lib/payments/fx-rounding";
import { methodFitsRegion } from "@/lib/payments/provider-input";
import { AdminCountryPicker } from "./admin-country-picker";
import { cn } from "@/lib/utils";
import { Check, Globe2, Loader2, Minus, Pencil, Plus, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Пустой `countryCodes` означает, что метод работает во всём мире. */
type Method = { id: string; name: string; hasLogo: boolean; countryCodes: string[] };
type Provider = {
  id: string; name: string; checkoutUrl: string | null; countryCodes: string[];
  invoiceCurrency: "usd" | "national"; feePayer: "client" | "merchant";
  enabled: boolean; clientVisible: boolean; methods: Method[]; updatedAt: string;
  fxRateUrl: string | null; fxRounding: number | null;
};
type Data = { providers: Provider[]; methods: Method[] };

const MAX_LOGO_BYTES = 200_000;
const RUSSIA = "RU";
/** Метод заведён миграцией 026 вместе с логотипом. */
const SBP_METHOD = "sbp";
const emptyForm = {
  name: "",
  worldwide: true,
  countryCodes: [] as string[],
  methodIds: [] as string[],
  invoiceCurrency: "usd" as "usd" | "national",
  feePayer: "client" as "client" | "merchant",
  enabled: false,
  clientVisible: false,
  fxRateUrl: "",
  fxRounding: 2 as number | null,
};

export function AdminPayments() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/payments", { cache: "no-store" });
    const payload = await response.json().catch(() => null) as (Data & { error?: string }) | null;
    if (!response.ok || !payload) throw new Error(payload?.error ?? "Не удалось загрузить провайдеров");
    setData(payload);
  };

  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Ошибка")); }, []);

  const openProvider = (provider: Provider) => {
    setEditingMethod(null);
    setEditingId(provider.id);
    setForm({
      name: provider.name,
      worldwide: provider.countryCodes.length === 0,
      countryCodes: provider.countryCodes,
      methodIds: provider.methods.map((method) => method.id),
      invoiceCurrency: provider.invoiceCurrency,
      feePayer: provider.feePayer,
      enabled: provider.enabled,
      clientVisible: provider.clientVisible,
      fxRateUrl: provider.fxRateUrl ?? "",
      fxRounding: provider.fxRounding ?? 2,
    });
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payments", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          name: form.name,
          countryCodes: form.worldwide ? [] : form.countryCodes,
          methodIds: form.methodIds,
          invoiceCurrency: form.invoiceCurrency,
          feePayer: form.feePayer,
          enabled: form.enabled,
          clientVisible: form.clientVisible,
          fxRateUrl: form.fxRateUrl,
          fxRounding: form.fxRounding,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? (editingId ? "Не удалось сохранить провайдера" : "Не удалось добавить провайдера"));
      await load();
      setForm(null);
      setEditingId(null);
      setMessage(editingId ? `Провайдер «${form.name}» сохранён.` : `Провайдер «${form.name}» добавлен.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveMethod = async (input: { name: string; logoDataUrl: string | null; countryCodes: string[] }) => {
    if (!editingMethod) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingMethod.id, ...input }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Не удалось сохранить метод");
      await load();
      setEditingMethod(null);
      setMessage(`Метод «${input.name}» сохранён.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const toggleProvider = async (provider: Provider, patch: { enabled?: boolean; clientVisible?: boolean }) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: provider.id, ...patch }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Не удалось обновить провайдера");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">{message ?? "Загрузка…"}</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="min-w-0 flex-1 text-xs text-slate-500">Секретные ключи провайдеров в браузер не отдаются: в админке настраиваются регион, методы оплаты и комиссия. Ссылку на оплату пропишет интеграция.</p>
      <button type="button" onClick={() => { setEditingMethod(null); setEditingId(null); setForm(form && !editingId ? null : { ...emptyForm }); }} disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white disabled:opacity-50">
        <Plus className="size-4" />{form && !editingId ? "Скрыть форму" : "Добавить"}
      </button>
    </div>

    {message ? <p className="rounded-xl bg-slate-900/70 p-3 text-xs text-slate-300" role="status">{message}</p> : null}

    {form ? <ProviderForm form={form} methods={data.methods} busy={busy} editing={Boolean(editingId)} onChange={setForm} onSave={() => void save()} onCancel={() => { setForm(null); setEditingId(null); }}
      onMethodsChanged={async () => { await load(); }} onError={setMessage} /> : null}

    {editingMethod ? <MethodEditForm key={editingMethod.id} method={editingMethod} busy={busy} onSave={(input) => void saveMethod(input)} onCancel={() => setEditingMethod(null)} onError={setMessage} /> : null}

    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {data.providers.map((provider) => <article key={provider.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => openProvider(provider)} className="min-w-0 truncate text-left font-semibold text-slate-100 hover:text-white">{provider.name}</button>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Изменить провайдера" disabled={busy} onClick={() => openProvider(provider)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50">
              <Pencil className="size-3.5" />
            </button>
            <span className={cn("rounded-full px-2 py-1 text-[10px] font-medium", provider.enabled
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100")}>
              {provider.enabled ? "Включён" : "Не настроен"}
            </span>
          </div>
        </div>

        <p className="truncate text-xs text-slate-500">{provider.checkoutUrl ?? "Ссылка на оплату появится после интеграции"}</p>

        <p className="text-xs text-slate-400">
          {provider.countryCodes.length
            ? <>Регион: {provider.countryCodes.slice(0, 6).map((code) => `${countryFlag(code)} ${countryName(code, "ru")}`).join(", ")}{provider.countryCodes.length > 6 ? ` и ещё ${provider.countryCodes.length - 6}` : ""}</>
            : <span className="inline-flex items-center gap-1.5"><Globe2 className="size-3.5" />Весь мир</span>}
        </p>

        {provider.methods.length ? <div className="flex flex-wrap gap-1.5">
          {provider.methods.map((method) => <button key={method.id} type="button" disabled={busy} onClick={() => { setForm(null); setEditingId(null); setEditingMethod(method); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 py-1 pl-1 pr-2.5 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50">
            <MethodLogo method={method} />{method.name}
            <Pencil className="size-3 text-slate-500" />
          </button>)}
        </div> : null}

        <dl className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <div><dt>Счёт</dt><dd className="text-slate-300">{provider.invoiceCurrency === "usd" ? "в USD" : "в нац. валюте"}</dd></div>
          <div><dt>Комиссия</dt><dd className="text-slate-300">{provider.feePayer === "client" ? "платит клиент" : "платит магазин"}</dd></div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={busy} onClick={() => void toggleProvider(provider, { enabled: !provider.enabled })}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 disabled:opacity-50">
            {provider.enabled ? "Отключить" : "Включить"}
          </button>
          <button type="button" disabled={busy} onClick={() => void toggleProvider(provider, { clientVisible: !provider.clientVisible })}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 disabled:opacity-50">
            {provider.clientVisible ? "Скрыть от клиентов" : "Показать клиентам"}
          </button>
        </div>
      </article>)}
    </div>
  </div>;
}

/** Флаги показывают, что метод работает не везде: без них СБП не отличить от карточного шлюза. */
function MethodRegion({ method }: { method: Method }) {
  if (!method.countryCodes.length) return <Globe2 className="size-3 shrink-0 text-slate-500" aria-label="Весь мир" />;
  const names = method.countryCodes.map((code) => countryName(code, "ru")).join(", ");
  return <span className="shrink-0 text-[10px] leading-none" title={names} aria-label={names}>
    {method.countryCodes.slice(0, 3).map((code) => countryFlag(code)).join("")}
    {method.countryCodes.length > 3 ? "…" : ""}
  </span>;
}

function MethodLogo({ method, size = 20 }: { method: Method; size?: number }) {
  if (!method.hasLogo) return <span aria-hidden className="grid size-5 place-items-center rounded-full bg-slate-800 text-[9px] text-slate-400">{method.name.slice(0, 1)}</span>;
  return <Image src={`/api/payment-methods/${method.id}/logo`} alt="" width={size} height={size} unoptimized className="size-5 rounded-full bg-white object-contain p-0.5" />;
}

function ProviderForm({ form, methods, busy, editing, onChange, onSave, onCancel, onMethodsChanged, onError }: {
  form: typeof emptyForm;
  methods: Method[];
  busy: boolean;
  editing: boolean;
  onChange: (next: typeof emptyForm) => void;
  onSave: () => void;
  onCancel: () => void;
  onMethodsChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [methodName, setMethodName] = useState("");
  const [methodLogo, setMethodLogo] = useState<string | null>(null);
  const [methodBusy, setMethodBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <Key extends keyof typeof emptyForm>(key: Key, value: (typeof emptyForm)[Key]) => onChange({ ...form, [key]: value });

  // Регион провайдера решает, какие методы вообще применимы: СБП работает только
  // в России, поэтому провайдеру «на весь мир» его предлагать нечестно.
  const region = form.worldwide ? [] : form.countryCodes;
  const available = methods.filter((method) => methodFitsRegion(method.countryCodes, region));
  const canAddMethod = form.worldwide || form.countryCodes.length > 0;

  /** Смена региона выбрасывает методы, которые в нём не работают. */
  const applyRegion = (worldwide: boolean, countryCodes: string[]) => {
    const fits = (id: string) => {
      const method = methods.find((item) => item.id === id);
      return method ? methodFitsRegion(method.countryCodes, worldwide ? [] : countryCodes) : false;
    };
    return { ...form, worldwide, countryCodes, methodIds: form.methodIds.filter(fits) };
  };

  /** В России платят через СБП, поэтому метод отмечается сам — снять галочку можно вручную. */
  const selectCountries = (next: string[]) => {
    const russiaAdded = next.includes(RUSSIA) && !form.countryCodes.includes(RUSSIA);
    const pruned = applyRegion(false, next);
    const suggestSbp = russiaAdded && !pruned.methodIds.includes(SBP_METHOD) && methods.some((method) => method.id === SBP_METHOD);
    onChange(suggestSbp ? { ...pruned, methodIds: [...pruned.methodIds, SBP_METHOD] } : pruned);
  };

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) { onError("Логотип не больше 200 КБ"); return; }
    const reader = new FileReader();
    reader.onload = () => setMethodLogo(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => onError("Не удалось прочитать файл логотипа");
    reader.readAsDataURL(file);
  };

  const addMethod = async () => {
    setMethodBusy(true);
    try {
      const response = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Метод привязывается к тому же региону, что выбран у провайдера
        body: JSON.stringify({ name: methodName, logoDataUrl: methodLogo, countryCodes: region }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; method?: Method } | null;
      if (!response.ok || !payload?.method) throw new Error(payload?.error ?? "Не удалось добавить метод");
      await onMethodsChanged();
      onChange({ ...form, methodIds: [...form.methodIds, payload.method.id] });
      setMethodName("");
      setMethodLogo(null);
      if (fileRef.current) fileRef.current.value = "";
      setAdding(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setMethodBusy(false);
    }
  };

  return <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    {/* Ссылка на оплату здесь не спрашивается: её пропишет интеграция с провайдером */}
    <label className="grid max-w-md gap-1 text-[10px] uppercase tracking-wider text-slate-500">Название провайдера
      <input value={form.name} onChange={(event) => set("name", event.target.value)} maxLength={60} required
        className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs normal-case text-slate-100" />
    </label>

    <fieldset className="grid gap-2">
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Регион работы</legend>
      <div className="flex flex-wrap gap-2">
        <Choice active={form.worldwide} onClick={() => onChange(applyRegion(true, form.countryCodes))}>Весь мир</Choice>
        <Choice active={!form.worldwide} onClick={() => onChange(applyRegion(false, form.countryCodes))}>Выбранные страны</Choice>
      </div>
      {form.worldwide ? null : <AdminCountryPicker value={form.countryCodes} onChange={selectCountries} />}
    </fieldset>

    <fieldset className="grid gap-2">
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Методы оплаты</legend>
      <div className="flex flex-wrap gap-2">
        {available.map((method) => {
          const checked = form.methodIds.includes(method.id);
          return <button key={method.id} type="button"
            onClick={() => set("methodIds", checked ? form.methodIds.filter((id) => id !== method.id) : [...form.methodIds, method.id])}
            className={cn("inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs",
              checked ? "border-blue-500 bg-blue-500/15 text-slate-100" : "border-slate-700 bg-slate-900 text-slate-300")}>
            <MethodLogo method={method} />{method.name}
            <MethodRegion method={method} />
            {checked ? <Check className="size-3.5 text-blue-300" /> : null}
          </button>;
        })}
        <button type="button" onClick={() => setAdding((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-600 px-3 py-1.5 text-xs text-slate-300">
          <Plus className="size-3.5" />Добавить метод
        </button>
      </div>
      <p className="text-[10px] text-slate-500">
        {available.length
          ? "Показаны методы этого региона: общемировые и привязанные к выбранным странам."
          : "Для этого региона методов ещё нет — добавьте первый."}
      </p>

      {adding ? <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
        {/* Подсказка вынесена под строку: иначе она растягивает поле с названием и роняет кнопку на второй ряд */}
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="grid gap-1 text-[10px] uppercase tracking-wider text-slate-500">Название метода
            <input value={methodName} onChange={(event) => setMethodName(event.target.value)} maxLength={40}
              className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case text-slate-100" />
          </label>
          <label className="grid gap-1 text-[10px] uppercase tracking-wider text-slate-500">Логотип
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case text-slate-300">
              <Upload className="size-3.5" />{methodLogo ? "Файл выбран" : "PNG, SVG до 200 КБ"}
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="hidden"
                onChange={(event) => pickLogo(event.target.files?.[0])} />
            </span>
          </label>
          <button type="button" disabled={methodBusy || !canAddMethod || methodName.trim().length < 2 || !methodLogo} onClick={() => void addMethod()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-40">
            {methodBusy ? <Loader2 className="size-4 animate-spin" /> : "Сохранить метод"}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Название не переводится: показывается так, как введено.{" "}
          {canAddMethod
            ? `Метод привяжется к региону: ${form.worldwide ? "весь мир" : form.countryCodes.map((code) => `${countryFlag(code)} ${countryName(code, "ru")}`).join(", ")}.`
            : "Сначала выберите страны — к ним и привяжется метод."}
        </p>
      </div> : null}
    </fieldset>

    <fieldset className="grid gap-2">
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Выставлять счета</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Choice active={form.invoiceCurrency === "usd"} onClick={() => onChange({ ...form, invoiceCurrency: "usd" })}>В USD</Choice>
        <Choice active={form.invoiceCurrency === "national"} onClick={() => onChange({
          ...form,
          invoiceCurrency: "national",
          worldwide: false,
          countryCodes: form.countryCodes.length ? form.countryCodes : [RUSSIA],
          fxRateUrl: form.fxRateUrl || "https://www.cbr.ru/scripts/XML_daily.asp",
          fxRounding: form.fxRounding ?? 2,
        })}>В национальной валюте</Choice>
      </div>
      {form.invoiceCurrency === "national" ? <div className="flex flex-wrap items-center gap-2">
        <input type="url" value={form.fxRateUrl} onChange={(event) => set("fxRateUrl", event.target.value)}
          placeholder="https://www.cbr.ru/scripts/XML_daily.asp" aria-label="Ссылка на курс к USD"
          className="h-9 min-w-72 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        <div className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900">
          <button type="button" aria-label="Крупнее округление" onClick={() => set("fxRounding", stepFxRounding(form.fxRounding ?? 2, -1))}
            className="grid h-9 w-9 place-items-center text-slate-800 dark:text-slate-100"><Minus className="size-3.5" /></button>
          <span className="min-w-12 px-1 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fxRoundingLabel(form.fxRounding ?? 2)}</span>
          <button type="button" aria-label="Точнее округление" onClick={() => set("fxRounding", stepFxRounding(form.fxRounding ?? 2, 1))}
            className="grid h-9 w-9 place-items-center text-slate-800 dark:text-slate-100"><Plus className="size-3.5" /></button>
        </div>
        <p className="w-full text-[10px] text-slate-500">Если эта ссылка не ответит, курс возьмём с запасного адреса ЦБ.</p>
      </div> : null}
      <div className="inline-flex h-9 w-max items-center rounded-full border border-slate-300 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-900">
        <button type="button" onClick={() => set("feePayer", "client")}
          className={cn("h-8 rounded-full px-3 text-xs font-medium", form.feePayer === "client" ? "bg-blue-500 text-white" : "text-slate-800 dark:text-slate-100")}>Платит клиент</button>
        <button type="button" onClick={() => set("feePayer", "merchant")}
          className={cn("h-8 rounded-full px-3 text-xs font-medium", form.feePayer === "merchant" ? "bg-blue-500 text-white" : "text-slate-800 dark:text-slate-100")}>Платит магазин</button>
      </div>
    </fieldset>

    <div className="flex flex-wrap items-end gap-4">
      <label className="grid max-w-64 gap-1 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.enabled} onChange={(event) => set("enabled", event.target.checked)} className="size-4 accent-blue-500" />
          Включить сразу
        </span>
        <span className="text-[10px] text-slate-500">Провайдер начинает работать. Без галочки он сохранится черновиком и платежи через него не пойдут.</span>
      </label>
      <label className="grid max-w-64 gap-1 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.clientVisible} onChange={(event) => set("clientVisible", event.target.checked)} className="size-4 accent-blue-500" />
          Показывать клиентам
        </span>
        <span className="text-[10px] text-slate-500">Провайдер появляется у клиентов при пополнении. Нужны обе галочки: с одной он останется невидимым.</span>
      </label>
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-700 px-4 text-xs text-slate-300">Отмена</button>
        <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-5 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing ? "Сохранить" : "Добавить провайдера"}
        </button>
      </div>
    </div>
  </form>;
}

function MethodEditForm({ method, busy, onSave, onCancel, onError }: {
  method: Method;
  busy: boolean;
  onSave: (input: { name: string; logoDataUrl: string | null; countryCodes: string[] }) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(method.name);
  const [logo, setLogo] = useState<string | null>(null);
  const [worldwide, setWorldwide] = useState(method.countryCodes.length === 0);
  const [countryCodes, setCountryCodes] = useState(method.countryCodes);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) { onError("Логотип не больше 200 КБ"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => onError("Не удалось прочитать файл логотипа");
    reader.readAsDataURL(file);
  };

  return <form onSubmit={(event) => { event.preventDefault(); onSave({ name, logoDataUrl: logo, countryCodes: worldwide ? [] : countryCodes }); }}
    className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <h3 className="text-sm font-semibold text-slate-100">Настройки метода</h3>
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
      <label className="grid gap-1 text-[10px] uppercase tracking-wider text-slate-500">Название метода
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required
          className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case text-slate-100" />
      </label>
      <label className="grid gap-1 text-[10px] uppercase tracking-wider text-slate-500">Логотип
        <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs normal-case text-slate-300">
          <Upload className="size-3.5" />{logo ? "Новый файл" : "Оставить текущий"}
          <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="hidden"
            onChange={(event) => pickLogo(event.target.files?.[0])} />
        </span>
      </label>
    </div>
    <fieldset className="grid gap-2">
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Регион метода</legend>
      <div className="flex flex-wrap gap-2">
        <Choice active={worldwide} onClick={() => setWorldwide(true)}>Весь мир</Choice>
        <Choice active={!worldwide} onClick={() => setWorldwide(false)}>Выбранные страны</Choice>
      </div>
      {worldwide ? null : <AdminCountryPicker value={countryCodes} onChange={setCountryCodes} />}
    </fieldset>
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-700 px-4 text-xs text-slate-300">Отмена</button>
      <button type="submit" disabled={busy || name.trim().length < 2} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-5 text-xs font-semibold text-white disabled:opacity-40">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}Сохранить метод
      </button>
    </div>
  </form>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={cn("rounded-xl border px-3.5 py-1.5 text-xs font-medium", active ? "border-blue-500 bg-blue-500/15 text-slate-900 dark:text-slate-100" : "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100")}>
    {children}
  </button>;
}