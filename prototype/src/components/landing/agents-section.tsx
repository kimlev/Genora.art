"use client";

import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { agentContextLabel } from "@/lib/agent-context";
import { agents } from "@/lib/mock/agents";
import { Link } from "@/components/ui/locale-link";

const landingAgentIds = [
  "decision-compare",
  "background-removal",
  "restore-old-photo",
  "remove-makeup",
  "pixie",
  "astronaut",
  "video-promt",
];

const landingAgents = landingAgentIds
  .map((id) => agents.find((agent) => agent.id === id))
  .filter((agent): agent is (typeof agents)[number] => Boolean(agent));

export function AgentsSection() {
  const t = useT();

  return (
    <section id="agents" className="scroll-mt-[60px] bg-mist/40 pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              {t.agents.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-steel sm:text-lg">
              {t.agents.subtitle}
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/agents" target="_blank" rel="noopener" />}
          >
            {t.agents.viewAll}
          </Button>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {landingAgents.map((agent) => (
            <div
              key={agent.id}
              id={agent.id === "video-promt" ? "video" : undefined}
              className="scroll-mt-[72px]"
            >
              <AgentPreviewCard
                className="w-full"
                agentId={agent.id}
                title={t.agents.items[agent.id]?.name ?? agent.name}
                description={t.agents.items[agent.id]?.description ?? agent.description}
                useLabel={t.agents.useAgent}
                tag={agentContextLabel(agent.category, t.agents)}
                href="/register"
                hrefTarget="_blank"
                hrefRel="noopener"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
