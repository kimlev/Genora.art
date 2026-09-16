"use client";

import { countryOptions } from "@/lib/geo/countries";
import { CirclePlus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Мультивыбор стран: чипы выбранных + плюс, чтобы открыть список.
 * Список можно закрыть крестиком, если страну не добавили.
 */
export function AdminCountryPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const options = useMemo(() => countryOptions("ru"), []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(value.length === 0);
  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter((option) =>
        option.name.toLowerCase().includes(query)
        || option.code.toLowerCase().startsWith(query)
        || option.currency.toLowerCase().startsWith(query))
    : options;
  const selected = value.flatMap((code) => { const option = options.find((item) => item.code === code); return option ? [option] : []; });
  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((option) => <button key={option.code} type="button" onClick={() => toggle(option.code)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 hover:border-red-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
        <span aria-hidden>{option.flag}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">{option.name}</span>
        <span className="text-[10px] text-slate-500">{option.currency}</span>
        <X className="size-3 text-slate-500" aria-label={`Убрать ${option.name}`} />
      </button>)}
      <button type="button" onClick={() => setOpen(true)} aria-label="Добавить страну"
        className="grid size-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
        <CirclePlus className="size-4" />
      </button>
    </div>

    {open ? <div className="rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <Search className="size-4 shrink-0 text-slate-500" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск страны"
          aria-label="Поиск страны" className="h-10 w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100" />
        <button type="button" onClick={() => { setOpen(false); setSearch(""); }} aria-label="Закрыть список стран"
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100">
          <X className="size-4" />
        </button>
      </div>
      <ul className="max-h-64 overflow-y-auto p-1">
        {visible.length ? visible.map((option) => {
          const checked = value.includes(option.code);
          return <li key={option.code}>
            <button type="button" onClick={() => toggle(option.code)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${
                checked
                  ? "bg-blue-500 text-white"
                  : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}>
              <span aria-hidden className="w-5 text-center">{checked ? "✓" : option.flag}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{option.name}</span>
              <span className={`shrink-0 text-[10px] tabular-nums ${checked ? "text-white/80" : "text-slate-500"}`}>{option.currency}</span>
            </button>
          </li>;
        }) : <li className="px-2.5 py-3 text-xs text-slate-500">Страна не найдена</li>}
      </ul>
    </div> : null}
  </div>;
}
