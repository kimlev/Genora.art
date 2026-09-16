"use client";

import { useLocale, useT } from "@/components/providers/locale-provider";
import { useCatalog } from "@/components/providers/catalog-provider";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import type { CommercialModel } from "@/lib/catalog/commercial-models";
import { sortModelsByStrength } from "@/lib/catalog/model-rank";
import { modelUseDescription } from "@/lib/i18n/copy/model-use";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Cpu } from "lucide-react";

export type ModelSelection = "auto" | string;

type ModelPickerProps = {
  value: ModelSelection;
  onChange: (modelId: ModelSelection) => void;
  provider?: "auto" | CommercialModel["provider"];
  allowAuto?: boolean;
  allowedIds?: string[];
  align?: "start" | "end";
  className?: string;
};

export function ModelPicker({ value, onChange, provider = "auto", allowAuto = true, allowedIds, align = "start", className }: ModelPickerProps) {
  const t = useT();
  const { locale } = useLocale();
  const { models } = useCatalog();
  const selected = value === "auto" ? null : models.find((model) => model.id === value);
  const visibleModels = sortModelsByStrength(
    (provider === "auto" ? models : models.filter((model) => model.provider === provider))
      .filter((model) => !allowedIds?.length || allowedIds.includes(model.id)),
  );

  return (
    <Menu
      ariaLabel={t.chat.selectModel}
      align={align}
      triggerClassName={cn(
        "flex min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        className,
      )}
      panelClassName="w-96 max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain"
      trigger={
        <>
          <Cpu className="size-4 shrink-0 text-accent-brand" />
          <span className="min-w-0 max-w-[140px] truncate">
            {selected?.name ?? (allowAuto ? t.chat.auto : value)}
          </span>
          {allowAuto && value === "auto" ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {t.chat.auto}
            </Badge>
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 text-steel" />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>{t.chat.selectModel}</MenuLabel>
          {allowAuto ? (
            <MenuItem
              active={value === "auto"}
              onClick={() => {
                onChange("auto");
                close();
              }}
            >
              <span className="flex flex-1 items-center gap-2">
                {t.chat.auto}
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {t.chat.auto}
                </Badge>
              </span>
              {value === "auto" ? (
                <Check className="size-4 text-accent-brand" />
              ) : null}
            </MenuItem>
          ) : null}

          {visibleModels.map((model) => (
            <MenuItem
              key={model.id}
              active={value === model.id}
              onClick={() => {
                onChange(model.id);
                close();
              }}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{model.name}</span>
                <span className="line-clamp-2 text-xs leading-snug text-steel">
                  {modelUseDescription(locale, model.id) ?? model.provider}
                </span>
              </span>
              {value === model.id ? (
                <Check className="size-4 shrink-0 text-accent-brand" />
              ) : null}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}
