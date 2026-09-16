"use client";

import { useT } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { isGpt55FamilyModel } from "@/lib/chat-request-policy";
import { cn } from "@/lib/utils";
import { BrainCircuit, Check, ChevronDown } from "lucide-react";

export type DepthSelection = "auto" | "fast" | "balanced" | "deep";

function depthToneClass(tone?: "danger") {
  return tone === "danger" ? "text-red-600 dark:text-red-400" : undefined;
}

export function DepthPicker({
  value,
  onChange,
  allowAuto = true,
  align = "start",
  className,
  modelId,
}: {
  value: DepthSelection;
  onChange: (value: DepthSelection) => void;
  allowAuto?: boolean;
  align?: "start" | "end";
  className?: string;
  modelId?: string;
}) {
  const t = useT();
  const slowModel = Boolean(modelId && isGpt55FamilyModel(modelId));
  const depthOptions: Array<{ id: DepthSelection; label: string; description: string; tone?: "danger"; descTone?: "danger" }> = [
    { id: "auto", label: t.chat.auto, description: t.chat.depthAutoDesc },
    { id: "fast", label: t.chat.depthFast, description: t.chat.depthFastDesc },
    {
      id: "balanced",
      label: t.chat.depthBalanced,
      description: slowModel ? t.chat.depthBalancedSlowDesc : t.chat.depthBalancedDesc,
      descTone: slowModel ? "danger" : undefined,
    },
    {
      id: "deep",
      label: t.chat.depthDeep,
      description: slowModel ? t.chat.depthBalancedVerySlowDesc : t.chat.depthDeepDesc,
      tone: slowModel ? "danger" : undefined,
      descTone: slowModel ? "danger" : undefined,
    },
  ];
  const options = allowAuto ? depthOptions : depthOptions.filter((option) => option.id !== "auto");
  const selected = options.find((option) => option.id === value) ?? options[0];
  const selectedTone = depthToneClass(selected.tone);

  return (
    <Menu
      ariaLabel={t.chat.depthAria}
      align={align}
      triggerClassName={cn(
        "flex min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        selectedTone,
        className,
      )}
      panelClassName="w-72"
      trigger={
        <>
          <BrainCircuit className={cn("size-4 shrink-0", selectedTone ?? "text-accent-brand")} />
          <span className="min-w-0 truncate">{selected.label}</span>
          {allowAuto && value === "auto" ? <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{t.chat.auto}</Badge> : null}
          <ChevronDown className="size-3.5 shrink-0 text-steel" />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>{t.chat.depthTitle}</MenuLabel>
          {options.map((option) => {
            const labelTone = depthToneClass(option.tone);
            const descTone = depthToneClass(option.descTone);
            return (
              <MenuItem key={option.id} active={value === option.id} onClick={() => { onChange(option.id); close(); }}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("font-medium", labelTone)}>{option.label}</span>
                  <span className={cn("text-xs", descTone ?? "text-steel")}>{option.description}</span>
                </span>
                {value === option.id ? <Check className={cn("size-4 shrink-0", labelTone ?? "text-accent-brand")} /> : null}
              </MenuItem>
            );
          })}
        </>
      )}
    </Menu>
  );
}
