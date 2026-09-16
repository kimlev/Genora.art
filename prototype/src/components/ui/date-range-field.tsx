"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function iso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, count: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + count, 1);
}

function formatRu(value: string): string {
  const date = parseIso(value);
  return date ? new Intl.DateTimeFormat("ru-RU").format(date) : "—";
}

function monthTitle(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(value);
}

function monthCells(month: Date): Array<Date | null> {
  const first = startOfMonth(month);
  const shift = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: shift }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  return cells;
}

function inRange(day: Date, from: string, to: string): boolean {
  const id = iso(day);
  if (from && to) return id >= from && id <= to;
  return id === from || id === to;
}

function MonthGrid({
  month,
  from,
  to,
  onPick,
}: {
  month: Date;
  from: string;
  to: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="w-[198px]">
      <p className="mb-2 text-center text-xs font-semibold capitalize text-slate-800">{monthTitle(month)}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-slate-400">
        {WEEKDAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {monthCells(month).map((day, index) => {
          if (!day) return <span key={`e-${index}`} />;
          const id = iso(day);
          const selected = id === from || id === to;
          const mid = inRange(day, from, to);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={`h-8 rounded-lg text-xs ${
                selected ? "bg-blue-500 font-semibold text-white"
                  : mid ? "bg-blue-50 text-slate-900"
                    : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Календарь периода: поле ровно по ширине дат, без пустого хвоста справа. */
export function DateRangeField({
  from,
  to,
  onFrom,
  onTo,
  label = "Период",
  hideLabel = false,
  align = "start",
  onWidth,
  onClear,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  label?: string;
  hideLabel?: boolean;
  align?: "start" | "end";
  onWidth?: (width: number) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(() => startOfMonth(parseIso(from) ?? new Date()));
  const boxRef = useRef<HTMLDivElement>(null);
  const pickingEnd = Boolean(from) && !to;
  const text = from && to ? `${formatRu(from)} — ${formatRu(to)}` : from ? `${formatRu(from)} — …` : "Выберите период";

  useEffect(() => {
    if (!onWidth || !boxRef.current) return;
    const node = boxRef.current;
    const report = () => onWidth(node.getBoundingClientRect().width);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onWidth, text]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (value: string) => {
    if (!from || (from && to)) {
      onFrom(value);
      onTo("");
      return;
    }
    if (value < from) {
      onTo(from);
      onFrom(value);
    } else {
      onTo(value);
    }
    setOpen(false);
  };

  return (
    <label className={hideLabel ? "block w-max" : "grid w-max gap-1 text-[10px] uppercase tracking-wider text-slate-500"}>
      {hideLabel ? null : <span>{label}</span>}
      <div ref={boxRef} className="relative w-max">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="inline-flex h-10 w-max items-center whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 text-left text-xs font-medium tabular-nums normal-case text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          {text}
          {onClear && (from || to) ? <span className="inline-block w-5" /> : null}
        </button>
        {onClear && (from || to) ? (
          <button
            type="button"
            aria-label="Сбросить период"
            onClick={() => { onClear(); setOpen(false); }}
            className="absolute right-2 top-2.5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        {open ? (
          <div className={`absolute top-11 z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-24px_rgba(2,10,25,.35)] dark:border-slate-700 dark:bg-slate-900 ${align === "end" ? "right-0" : "left-0"}`}>
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Предыдущий месяц" onClick={() => setLeft((value) => addMonths(value, -1))} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="Следующий месяц" onClick={() => setLeft((value) => addMonths(value, 1))} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <MonthGrid month={left} from={from} to={to} onPick={pick} />
              <MonthGrid month={addMonths(left, 1)} from={from} to={to} onPick={pick} />
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{pickingEnd ? "Выберите дату окончания" : "Выберите дату начала, затем дату окончания"}</p>
          </div>
        ) : null}
      </div>
    </label>
  );
}
