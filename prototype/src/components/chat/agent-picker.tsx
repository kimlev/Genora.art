"use client";

import { TextAgentsGallery } from "@/components/chat/text-agents-gallery";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { AgentIcon } from "@/components/agents/agent-icon";
import { useCustomAgents } from "@/lib/custom-agents";
import { useCatalogAgentOverrides } from "@/lib/use-catalog-agent-overrides";
import { listVisibleAgents } from "@/lib/mock/agents";
import type { Agent } from "@/lib/mock/agent-types";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

const TEXT_CATEGORIES = new Set(["analysis", "writing", "code", "marketing"]);

type AgentPickerProps = {
  value: string | null;
  onChange: (agentId: string | null) => void;
  className?: string;
};

export function ClearAgentButton({ onClear, className, compact, tone = "default" }: { onClear: () => void; className?: string; compact?: boolean; tone?: "default" | "danger" }) {
  const { locale } = useLocale();
  const label = locale === "ru" ? "Сбросить агента" : "Clear agent";
  const danger = tone === "danger";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClear}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border transition-colors",
        danger
          ? "size-[1em] border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20"
          : compact
            ? "size-[1cap] border-current/35 bg-transparent text-current hover:bg-current/10"
            : "size-6 border-border bg-surface text-steel hover:bg-mist hover:text-text",
        className,
      )}
    >
      <X className={danger ? "size-[0.72em]" : compact ? "size-[0.55em]" : "size-3"} strokeWidth={danger ? 2.6 : compact ? 2.6 : 2} />
    </button>
  );
}

export function AgentPicker({ value, onChange, className }: AgentPickerProps) {
  const t = useT();
  const { customAgents } = useCustomAgents();
  const catalogVersion = useCatalogAgentOverrides();
  const [open, setOpen] = useState(false);
  const textAgents = useMemo<Agent[]>(() => {
    const catalog = listVisibleAgents().filter((agent) => TEXT_CATEGORIES.has(agent.category));
    const custom = customAgents
      .filter((item) => TEXT_CATEGORIES.has(item.context))
      .map((item): Agent => ({
        id: item.id,
        name: item.name,
        category: item.context === "images" || item.context === "song" || item.context === "video" ? "writing" : item.context,
        description: item.description,
        modelId: "",
        systemPrompt: item.systemPrompt ?? "",
        icon: item.icon,
      }));
    const ids = new Set(catalog.map((item) => item.id));
    return [...custom.filter((item) => !ids.has(item.id)), ...catalog];
  }, [catalogVersion, customAgents]);
  const selected = value ? textAgents.find((agent) => agent.id === value) : null;

  return (
    <>
      <button
        type="button"
        aria-label={t.chat.selectAgent}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist",
          value ? "border-accent-brand bg-accent-brand/10 ring-2 ring-accent-brand/20" : "",
          className,
        )}
      >
        <AgentIcon icon={selected?.icon} className="size-4 shrink-0 text-accent-brand" />
        <span className="min-w-0 max-w-[140px] truncate">
          {selected ? (t.agents.items[selected.id]?.name ?? selected.name) : t.chat.noAgent}
        </span>
        {value === null ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {t.chat.auto}
          </Badge>
        ) : null}
        <ChevronDown className="size-3.5 text-steel" />
      </button>
      {open ? createPortal(
        <TextAgentsGallery
          agents={textAgents}
          selectedAgentId={value}
          onClose={() => setOpen(false)}
          onChoose={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />,
        document.body,
      ) : null}
    </>
  );
}
