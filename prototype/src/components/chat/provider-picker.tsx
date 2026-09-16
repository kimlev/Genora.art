"use client";

import { Badge } from "@/components/ui/badge";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useT } from "@/components/providers/locale-provider";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import type { CommercialModel } from "@/lib/catalog/commercial-models";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Network } from "lucide-react";
import { ProviderLogo } from "./provider-logo";

export type ProviderSelection = "auto" | CommercialModel["provider"];

export function ProviderPicker({
  value,
  onChange,
  showLogos = true,
  allowAuto = true,
  allowedProviders,
  align = "start",
  className,
}: {
  value: ProviderSelection;
  onChange: (value: ProviderSelection) => void;
  showLogos?: boolean;
  allowAuto?: boolean;
  allowedProviders?: string[];
  align?: "start" | "end";
  className?: string;
}) {
  const t = useT();
  const { providers: catalogProviders } = useCatalog();
  const providers = (allowedProviders?.length ? allowedProviders : catalogProviders.map((provider) => provider.name));
  const options = allowAuto ? ["auto", ...providers] : providers;
  return (
    <Menu
      ariaLabel={t.chat.selectProvider}
      align={align}
      triggerClassName={cn(
        "flex min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        className,
      )}
      panelClassName="w-60"
      trigger={
        <>
          {showLogos && value !== "auto" ? <ProviderLogo provider={value} className="size-5 shrink-0" /> : <Network className="size-4 shrink-0 text-accent-brand" />}
          <span className="min-w-0 truncate">{value === "auto" ? t.chat.provider : value}</span>
          {allowAuto && value === "auto" ? <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{t.chat.auto}</Badge> : null}
          <ChevronDown className="size-3.5 shrink-0 text-steel" />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>{t.chat.selectProvider}</MenuLabel>
          {options.map((provider) => (
            <MenuItem
              key={provider}
              active={value === provider}
              onClick={() => { onChange(provider as ProviderSelection); close(); }}
            >
              {showLogos && provider !== "auto" ? <ProviderLogo provider={provider as CommercialModel["provider"]} className="size-6" /> : null}
              <span className="flex-1">{provider === "auto" ? t.chat.automatically : provider}</span>
              {value === provider ? <Check className="size-4 text-accent-brand" /> : null}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}
