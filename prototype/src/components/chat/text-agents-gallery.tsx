"use client";

import { AgentIcon } from "@/components/agents/agent-icon";
import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { useLocale } from "@/components/providers/locale-provider";
import { TEXT_AGENT_TAGS, textAgentGalleryCopy, type TextAgentTag } from "@/lib/i18n/copy/text-agent-gallery-copy";
import { agentDescription, agentName } from "@/lib/mock/agents";
import type { Agent } from "@/lib/mock/agent-types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function TextAgentsGallery({
  agents,
  selectedAgentId,
  onChoose,
  onClose,
}: {
  agents: Agent[];
  selectedAgentId?: string | null;
  onChoose: (id: string | null) => void;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const copy = textAgentGalleryCopy(locale);
  const [tag, setTag] = useState<TextAgentTag>("all");
  const visible = useMemo(
    () => agents.filter((agent) => tag === "all" || agent.category === tag),
    [agents, tag],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-bg p-6" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-lg font-semibold text-text">{copy.title}</h2>
          <button
            type="button"
            onClick={() => onChoose(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              !selectedAgentId ? "border-accent-brand bg-accent-brand text-white" : "border-border bg-surface text-steel hover:text-text",
            )}
          >
            {copy.none}
          </button>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-border hover:bg-mist" aria-label={copy.close}>
          <X className="size-5" />
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TEXT_AGENT_TAGS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTag(item)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors",
              tag === item ? "border-accent-brand bg-accent-brand text-white" : "border-border bg-surface text-steel hover:text-text",
            )}
          >
            #{copy.tag[item]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {visible.map((agent) => (
              <AgentPreviewCard
                key={agent.id}
                agentId={agent.id}
                title={agentName(agent.id, locale) || agent.name}
                description={agentDescription(agent.id, locale) || agent.description}
                useLabel={copy.use}
                onUse={() => onChoose(agent.id)}
                className={selectedAgentId === agent.id ? "ring-2 ring-accent-brand ring-offset-2 ring-offset-bg" : undefined}
                leading={(
                  <span className="pointer-events-none absolute start-2.5 bottom-3 z-20 grid size-8 place-items-center rounded-lg bg-black/55 text-white">
                    <AgentIcon icon={agent.icon} className="size-4" />
                  </span>
                )}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-steel">{copy.empty}</p>
        )}
      </div>
    </div>
  );
}
