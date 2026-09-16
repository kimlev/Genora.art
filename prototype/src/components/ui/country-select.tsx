"use client";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useLocale } from "@/components/providers/locale-provider";
import { countryLabel, countryOptions } from "@/lib/geo/countries";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Стран больше двух сотен, поэтому список с поиском, а не простой выпадающий
 * список: без фильтра нужную страну приходится искать глазами.
 */
export function CountrySelect({
  value,
  onChange,
  label,
  placeholder,
  searchLabel,
  emptyLabel,
  id,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  placeholder: string;
  searchLabel: string;
  emptyLabel: string;
  id?: string;
  className?: string;
}) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const options = useMemo(() => countryOptions(locale), [locale]);
  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter((option) =>
        option.name.toLowerCase().includes(query)
        || option.code.toLowerCase().startsWith(query)
        || option.currency.toLowerCase().startsWith(query),
      )
    : options;
  const selected = options.find((option) => option.code === value);
  // У старых профилей страна хранится текстом, поэтому показываем её как есть.
  const current = selected ? selected.name : countryLabel(value, locale) || placeholder;

  return (
    <Menu
      ariaLabel={`${label}: ${current}`}
      triggerClassName={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        className,
      )}
      panelClassName="max-h-80"
      trigger={<>
        <span className={cn("min-w-0 flex-1 truncate text-start font-medium", selected || value ? "" : "text-steel")} id={id}>
          {selected ? `${selected.flag} ${selected.name}` : current}
        </span>
        <ChevronDown className="size-4 shrink-0 text-steel" />
      </>}
    >
      {(close) => <>
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 bg-surface px-1.5 pb-1.5 pt-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-2.5">
            <Search className="size-4 shrink-0 text-steel" />
            <input
              // Клик по полю не должен закрывать панель, а Enter — отправлять форму профиля
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
            key={option.code}
            active={option.code === value}
            onClick={() => { onChange(option.code); setSearch(""); close(); }}
          >
            <span aria-hidden className="text-base leading-none">{option.flag}</span>
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-steel">{option.currency}</span>
            {option.code === value ? <Check className="size-4 shrink-0 text-accent-brand" /> : null}
          </MenuItem>
        ))}
      </>}
    </Menu>
  );
}
