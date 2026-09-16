"use client";

import { Menu, MenuItem } from "@/components/ui/menu";
import { useLocale } from "@/components/providers/locale-provider";
import { timezoneLabel, timezoneOptions } from "@/lib/geo/timezones";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Все часовые пояса IANA. Список длинный, поэтому с поиском — как у стран.
 */
export function TimezoneSelect({
  value,
  onChange,
  label,
  searchLabel,
  emptyLabel,
  className,
  locale: localeOverride,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  searchLabel: string;
  emptyLabel: string;
  className?: string;
  locale?: string;
}) {
  const { locale: uiLocale } = useLocale();
  const locale = localeOverride ?? uiLocale;
  const [search, setSearch] = useState("");
  const options = useMemo(() => timezoneOptions(locale), [locale]);
  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query)
        || option.id.toLowerCase().includes(query)
        || option.offset.toLowerCase().includes(query),
      )
    : options;
  const selected = options.find((option) => option.id === value);
  const current = selected?.label ?? (value ? timezoneLabel(value, locale) : label);

  return (
    <Menu
      ariaLabel={`${label}: ${current}`}
      triggerClassName={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        className,
      )}
      panelClassName="max-h-80"
      trigger={<>
        <span className="min-w-0 flex-1 truncate text-start font-medium">{current}</span>
        <ChevronDown className="size-4 shrink-0 text-steel" />
      </>}
    >
      {(close) => <>
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 bg-surface px-1.5 pb-1.5 pt-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-2.5">
            <Search className="size-4 shrink-0 text-steel" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className="h-9 w-full min-w-0 bg-transparent text-sm text-text outline-none placeholder:text-steel"
            />
          </div>
        </div>
        {visible.length === 0 ? <p className="px-2.5 py-3 text-sm text-steel">{emptyLabel}</p> : null}
        {visible.map((option) => (
          <MenuItem
            key={option.id}
            active={option.id === value}
            onClick={() => { onChange(option.id); setSearch(""); close(); }}
          >
            <span className="min-w-0 flex-1 truncate">{option.city}</span>
            <span className="shrink-0 text-xs tabular-nums text-steel">{option.offset}</span>
            {option.id === value ? <Check className="size-4 shrink-0 text-accent-brand" /> : null}
          </MenuItem>
        ))}
      </>}
    </Menu>
  );
}
