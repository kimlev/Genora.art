"use client";

import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export type SelectMenuOption = { value: string; label: string };

/**
 * Выпадающий список выбора. Собран на нашем меню, а не на системном `select`:
 * системный список отдаёт панель браузеру, и во встроенных браузерах она не открывается.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  className,
  panelClassName,
  highlight = false,
}: {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  panelClassName?: string;
  highlight?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const triggerLabel = selected?.label ?? placeholder ?? options[0]?.label ?? "";
  return (
    <Menu
      // Читалки экрана заменяют содержимое кнопки на подпись, поэтому в неё входит и выбранное значение
      ariaLabel={triggerLabel ? `${ariaLabel}: ${triggerLabel}` : ariaLabel}
      triggerClassName={cn(
        "flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        highlight ? "border-accent-brand bg-accent-brand/10 ring-2 ring-accent-brand/20" : "border-border bg-surface",
        className,
      )}
      panelClassName={panelClassName}
      trigger={<>
        <span className="min-w-0 flex-1 truncate text-start font-medium">{triggerLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-steel" />
      </>}
    >
      {(close) => <>
        <MenuLabel>{ariaLabel}</MenuLabel>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            active={option.value === selected?.value}
            onClick={() => { onChange(option.value); close(); }}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.value === selected?.value ? <Check className="size-4 shrink-0 text-accent-brand" /> : null}
          </MenuItem>
        ))}
      </>}
    </Menu>
  );
}
