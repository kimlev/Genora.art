"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type AdminSelectOption = { value: string; label: string; hint?: string; icon?: ReactNode; swatch?: string };

/**
 * Список выбора для админки. Панель рисуется в разметке, а не браузером:
 * системный список отдаёт панель браузеру, и во встроенных браузерах она не открывается.
 * Пустое значение означает «без фильтра», поэтому крестик появляется только у выбранного пункта.
 */
export function AdminSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange,
  className,
  clearable = true,
}: {
  label: string;
  value: string;
  options: AdminSelectOption[];
  emptyLabel: string;
  onChange: (value: string) => void;
  className?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (next: string) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  return (
    <label className="grid gap-1 text-[10px] uppercase tracking-wider text-slate-500">
      <span>{label}</span>
      <div ref={boxRef} className={cn("relative", className)}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
          className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {selected?.icon ? <span className="grid size-5 shrink-0 place-items-center">{selected.icon}</span> : null}
          {selected?.swatch ? <span className={cn("size-2 shrink-0 rounded-full", selected.swatch)} /> : null}
          <span className={cn("min-w-0 flex-1 truncate text-left", selected ? "text-slate-900 dark:text-slate-100" : "text-slate-500")}>
            {selected?.label ?? emptyLabel}
          </span>
          {selected && clearable ? <span className="w-5 shrink-0" /> : null}
          <ChevronDown className="size-4 shrink-0 text-slate-500" />
        </button>

        {selected && clearable ? (
          <button
            type="button"
            aria-label={`Сбросить: ${label}`}
            onClick={() => pick("")}
            className="absolute right-8 top-2.5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="size-3.5" />
          </button>
        ) : null}

        {open ? (
          <ul
            role="listbox"
            className="absolute left-0 top-11 z-50 max-h-72 w-full min-w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_24px_60px_-24px_rgba(2,10,25,.35)] dark:border-slate-700 dark:bg-slate-950"
          >
            {(clearable ? [{ value: "", label: emptyLabel }, ...options] : options).map((option) => (
              <li key={option.value || "all"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => pick(option.value)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs normal-case",
                    option.value === value ? "bg-orange-50 text-slate-900 dark:bg-orange-500/15 dark:text-slate-100" : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  {"icon" in option && option.icon ? <span className="grid size-5 shrink-0 place-items-center">{option.icon}</span> : null}
                  {"swatch" in option && option.swatch ? <span className={cn("mt-1 size-2 shrink-0 rounded-full", option.swatch)} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {"hint" in option && option.hint
                      ? <span className="block truncate text-[10px] text-slate-500">{option.hint}</span>
                      : null}
                  </span>
                  {option.value === value ? <Check className="mt-0.5 size-3.5 shrink-0 text-orange-400" /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </label>
  );
}
