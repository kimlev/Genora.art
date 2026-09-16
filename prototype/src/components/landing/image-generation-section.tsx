"use client";

import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { LandingFeatureTiles } from "@/components/landing/landing-feature-tiles";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { agentDescription, agentName } from "@/lib/mock/agents";
import { ArrowRight, ImageIcon, Layers3, Maximize2, Sparkles } from "lucide-react";
import { Link } from "@/components/ui/locale-link";

const showcaseAgentIds = ["add-makeup", "anime-hero", "comic", "family-photo", "bald", "santorini"] as const;
const icons = [Sparkles, ImageIcon, Maximize2, Layers3];

export function ImageGenerationSection() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <section id="image-generation" className="scroll-mt-[60px] bg-bg pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/image-examples" className="mx-auto mb-10 block max-w-3xl rounded-2xl text-center outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{t.imageLanding.eyebrow}</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-5xl">{t.imageLanding.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{t.imageLanding.subtitle}</p>
        </Link>
        <div className="overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_30px_90px_-65px_color-mix(in_oklch,var(--accent)_65%,transparent)]">
          <div className="grid items-stretch lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative min-h-[360px] overflow-hidden bg-[#08294a] p-4 sm:p-5 lg:min-h-[560px] lg:p-6">
              <div className="grid h-full grid-cols-2 gap-2 sm:gap-2.5">
                {showcaseAgentIds.map((agentId) => (
                  <AgentPreviewCard
                    key={agentId}
                    agentId={agentId}
                    title={agentName(agentId, locale)}
                    description={agentDescription(agentId, locale)}
                    useLabel={t.agents.useAgent}
                    href="/image-examples"
                    headingAs="h3"
                    className="aspect-[4/5] min-h-0 rounded-xl border-white/10 shadow-none"
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071d35]/35 via-transparent to-transparent" />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand"><ImageIcon className="size-4" />{t.imageLanding.badge}</p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{t.imageLanding.headline}</h3>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-steel">{t.imageLanding.body}</p>
              <LandingFeatureTiles items={t.imageLanding.items} icons={icons} />
              <Link href="/image-examples" className="mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white outline-none transition-colors hover:bg-[#3b8ef0] focus-visible:ring-2 focus-visible:ring-accent-brand/40">
                {t.imageLanding.cta} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
