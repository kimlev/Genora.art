"use client";

import { ProviderLogo } from "@/components/chat/provider-logo";
import { useT } from "@/components/providers/locale-provider";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Network } from "lucide-react";

export type ProviderMenuOption = { value: string; label: string; logoName?: string };

/** Значение «все провайдеры»: у него нет логотипа, поэтому показываем общий значок */
export const ALL_PROVIDERS = "all";

export function ProviderMenuSelect({ value, options, onChange, label, className = "", highlight = false }: { value: string; options: ProviderMenuOption[]; onChange: (value: string) => void; label?: string; className?: string; highlight?: boolean }) {
  const t = useT();
  const menuLabel = label ?? t.pricingPage.providerLabel;
  const selected = options.find((item) => item.value === value) ?? options[0];
  return <Menu
    ariaLabel={menuLabel}
    triggerClassName={cn(
      "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
      highlight ? "border-accent-brand bg-accent-brand/10 ring-2 ring-accent-brand/20" : "border-border bg-surface",
      className,
    )}
    panelClassName="w-64"
    trigger={<>
      {selected?.value === ALL_PROVIDERS ? <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist"><Network className="size-4 text-accent-brand" /></span> : <ProviderLogo provider={selected?.logoName ?? selected?.label ?? ""} className="size-7" />}
      <span className="min-w-0 flex-1 truncate text-left font-medium">{selected?.label ?? t.pricingPage.providerAll}</span>
      <ChevronDown className="size-4 shrink-0 text-steel" />
    </>}
  >
    {(close) => <>
      <MenuLabel>{menuLabel}</MenuLabel>
      {options.map((option) => <MenuItem key={option.value} active={value === option.value} onClick={() => { onChange(option.value); close(); }}>
        {option.value === ALL_PROVIDERS ? <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist"><Network className="size-4 text-accent-brand" /></span> : <ProviderLogo provider={option.logoName ?? option.label} className="size-7" />}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {value === option.value ? <Check className="size-4 text-accent-brand" /> : null}
      </MenuItem>)}
    </>}
  </Menu>;
}
