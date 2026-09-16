"use client";

import { DateRangeField } from "@/components/ui/date-range-field";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

/** Период, фильтры и «Показать» — одна строка, кнопка всегда справа. */
export function AdminDateRange({
  from,
  to,
  onFrom,
  onTo,
  onApply,
  loading,
  filters,
  secondary,
  nowrap = false,
  onClear,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onApply: () => void;
  loading: boolean;
  filters?: ReactNode;
  secondary?: ReactNode;
  nowrap?: boolean;
  onClear?: () => void;
}) {
  const [periodWidth, setPeriodWidth] = useState(0);

  return (
    <div className={cn("flex items-end gap-2", nowrap ? "flex-nowrap" : "flex-wrap")}>
      <DateRangeField from={from} to={to} onFrom={onFrom} onTo={onTo} onWidth={setPeriodWidth} onClear={onClear} />
      {filters}
      {secondary ? (
        <div className={`[&>label]:w-full ${periodWidth ? "" : "w-max"}`} style={periodWidth ? { width: periodWidth } : undefined}>
          {secondary}
        </div>
      ) : null}
      <button type="button" disabled={loading || !from || !to} onClick={onApply} className="ml-auto h-10 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white disabled:opacity-60">
        Показать
      </button>
    </div>
  );
}
