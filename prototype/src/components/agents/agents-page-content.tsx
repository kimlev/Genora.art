"use client";

import { AGENT_SAVED_EVENT, openAgentBuilder } from "@/components/agents/agent-builder-dialog";
import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { agentContextLabel, agentKindOf, agentLaunchHref, TEXT_AGENT_SPECIALTIES, type AgentKind, type AgentTextSpecialty } from "@/lib/agent-context";
import { MY_AGENT_COVER } from "@/lib/agent-preview";
import { useCustomAgents } from "@/lib/custom-agents";
import { studioGalleryCopy } from "@/lib/i18n/copy/studio-gallery-copy";
import { IMAGE_AGENT_TAGS, imageAgentMatchesTag, type ImageAgentTag } from "@/lib/image-agent-gallery";
import { useCatalogAgentOverrides } from "@/lib/use-catalog-agent-overrides";
import { getCatalogAgentOverride } from "@/lib/catalog-agent-overrides";
import { agentDescription, agentName, listVisibleAgents, type AgentCategory } from "@/lib/mock/agents";
import { Clapperboard, Hash, ImageIcon, LayoutGrid, Pencil, Type, UserRound, type LucideIcon } from "lucide-react";
import { useLocalePush, useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { useEffect, useMemo, useState } from "react";

type CatalogFilter = AgentKind | "mine";
type SpecialtyFilter = AgentTextSpecialty | "mine";
type SavedAgentDetail = { id?: string; context?: AgentCategory };

const filterIcons: Record<CatalogFilter, LucideIcon> = {
  all: LayoutGrid,
  text: Type,
  images: ImageIcon,
  video: Clapperboard,
  mine: UserRound,
};

export function AgentsPageContent() {
  const { locale, dictionary: t } = useLocale();
  const router = useLocaleRouter();
  const pushLocale = useLocalePush();
  const { ready: authReady, user } = useAuth();
  const { setActiveAgentId, setActiveConversationId, startNewChat } = useWorkspace();
  const { customAgents } = useCustomAgents();
  const kindFilters: Array<{ id: CatalogFilter; label: string }> = [
    { id: "all", label: t.agents.filterAll },
    { id: "text", label: t.agents.filterText },
    { id: "images", label: t.agents.filterImages },
    { id: "video", label: t.agents.filterVideo },
    { id: "mine", label: t.agents.filterMine },
  ];
  const specialtyFilters = TEXT_AGENT_SPECIALTIES.map((id) => ({
    id,
    label: {
      writing: t.agents.filterWriting,
      code: t.agents.filterCode,
      analysis: t.agents.filterAnalysis,
      marketing: t.agents.filterMarketing,
    }[id],
  }));
  const [kind, setKind] = useState<CatalogFilter>("all");
  const [specialty, setSpecialty] = useState<SpecialtyFilter | null>(null);
  const [imageTag, setImageTag] = useState<ImageAgentTag>("all");
  const [savedId, setSavedId] = useState<string | null>(null);
  const galleryCopy = studioGalleryCopy(locale);
  const catalogVersion = useCatalogAgentOverrides();
  const agents = useMemo(() => listVisibleAgents(), [catalogVersion, locale]);

  useEffect(() => {
    const onSaved = (event: Event) => {
      const raw = "detail" in event ? (event as CustomEvent<SavedAgentDetail | string>).detail : null;
      const detail = typeof raw === "string" ? { id: raw } : raw;
      if (!detail?.id) return;
      setSavedId(detail.id);
      if (detail.context) {
        const next = agentKindOf(detail.context);
        if (next === "video") {
          setKind("mine");
          setSpecialty(null);
        } else {
          setKind(next);
          setSpecialty("mine");
        }
      } else {
        setKind("mine");
        setSpecialty(null);
      }
    };
    window.addEventListener(AGENT_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(AGENT_SAVED_EVENT, onSaved);
  }, []);

  const visibleAgents = useMemo(() => {
    if (kind === "mine") return customAgents;
    if (kind === "all") return [...customAgents, ...agents];

    const customInKind = customAgents.filter((agent) => agentKindOf(agent.context) === kind);
    if (specialty === "mine") return customInKind;

    const catalog = agents.filter((agent) => {
      if (agentKindOf(agent.category) !== kind) return false;
      if (kind === "text" && specialty) return agent.category === specialty;
      if (kind === "images" && !imageAgentMatchesTag(agent.id, imageTag)) return false;
      return true;
    });
    return specialty ? catalog : [...customInKind, ...catalog];
  }, [kind, specialty, imageTag, customAgents, agents]);

  const catalogChipClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-[#FF6F00] bg-[#FF6F00] text-white" : "border-border bg-surface text-steel hover:text-text"}`;

  const launchAgent = (id: string) => {
    const custom = customAgents.find((agent) => agent.id === id);
    const selected = agents.find((agent) => agent.id === id);
    const context = custom?.context ?? selected?.category ?? "writing";
    const isMedia = context === "images" || context === "video";
    if (!user && !isMedia) {
      router.push("/register");
      return;
    }
    setActiveAgentId(id);
    setActiveConversationId(null);
    if (!isMedia) startNewChat({ keepAgent: true });
    pushLocale(agentLaunchHref(id, context));
  };

  const schema = { "@context": "https://schema.org", "@type": "ItemList", name: t.agents.catalogTitle, itemListElement: agents.map((agent, index) => ({ "@type": "ListItem", position: index + 1, name: agentName(agent.id, locale), description: agentDescription(agent.id, locale) })) };

  return (
    <div className="mx-auto max-w-6xl px-5 pt-4 pb-12 sm:px-8 sm:pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">{t.agents.catalogEyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-5xl">{t.agents.catalogTitle}</h1>
        <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{t.agents.catalogSubtitle}</p>
      </div>

      <div className="mt-8" aria-label={t.agents.filtersLabel}>
        <div className="flex flex-wrap gap-2">
          {kindFilters.map((filter) => {
            const KindIcon = filterIcons[filter.id];
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => { setKind(filter.id); setSpecialty(null); setImageTag("all"); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${kind === filter.id ? "border-[#FF6F00] bg-[#FF6F00] text-white" : "border-border bg-surface text-steel hover:text-text"}`}
              >
                <KindIcon className="size-3.5 shrink-0" />
                {filter.label}
              </button>
            );
          })}
        </div>
        {kind === "text" || kind === "images" ? (
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex flex-wrap gap-2">
              {kind === "images" ? IMAGE_AGENT_TAGS.filter((item) => item !== "all").map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setImageTag((current) => current === item ? "all" : item); setSpecialty(null); }}
                  className={catalogChipClass(imageTag === item)}
                >
                  <Hash className="size-3 shrink-0 opacity-70" />
                  {galleryCopy.tag[item]}
                </button>
              )) : specialtyFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSpecialty((current) => current === filter.id ? null : filter.id)}
                  className={catalogChipClass(specialty === filter.id)}
                >
                  <Hash className="size-3 shrink-0 opacity-70" />
                  {filter.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSpecialty((current) => current === "mine" ? null : "mine")}
                className={catalogChipClass(specialty === "mine")}
              >
                <Hash className="size-3 shrink-0 opacity-70" />
                {t.agents.filterMine}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleAgents.map((agent) => {
          const custom = "category" in agent && agent.category === "custom";
          const context = custom ? agent.context : agent.category;
          const isMedia = context === "images" || context === "video";
          return (
            <AgentPreviewCard
              key={agent.id}
              agentId={agent.id}
              headingAs="h2"
              title={custom ? agent.name : agentName(agent.id, locale)}
              description={custom ? agent.description : agentDescription(agent.id, locale)}
              useLabel={t.agents.useAgent}
              tag={custom ? t.agents.filterMine : agentContextLabel(agent.category, t.agents)}
              coverSrc={custom ? MY_AGENT_COVER : (getCatalogAgentOverride(agent.id)?.coverUrl ?? undefined)}
              href={isMedia ? agentLaunchHref(agent.id, context) : undefined}
              disabled={!authReady && !isMedia}
              onUse={isMedia ? undefined : () => launchAgent(agent.id)}
              className={savedId === agent.id ? "border-accent-brand ring-2 ring-accent-brand/15" : undefined}
              leading={custom ? (
                <button
                  type="button"
                  aria-label={`${t.agents.builderEdit} ${agent.name}`}
                  className="absolute start-2 top-2 z-20 rounded-lg bg-black/40 p-1.5 text-white hover:bg-black/60"
                  onClick={() => openAgentBuilder({ id: agent.id, name: agent.name, description: agent.description, systemPrompt: agent.systemPrompt, icon: agent.icon, context: agent.context })}
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
            />
          );
        })}
      </div>
    </div>
  );
}
