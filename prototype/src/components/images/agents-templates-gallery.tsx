"use client";

import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { useLocale } from "@/components/providers/locale-provider";
import { studioGalleryCopy } from "@/lib/i18n/copy/studio-gallery-copy";
import {
  IMAGE_AGENT_TAGS,
  imageAgentMatchesTag,
  type ImageAgentTag,
  type StudioGalleryTab,
} from "@/lib/image-agent-gallery";
import { agentDescription, agentName } from "@/lib/mock/agents";
import {
  VIDEO_AGENT_TAGS,
  videoAgentCopy,
  videoAgentTagLabel,
  type VideoAgentFilterTag,
} from "@/lib/video-agent-catalog";
import { cn } from "@/lib/utils";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const GALLERY_PAGE_SIZE = 8;

export type GalleryAgent = {
  id: string;
  name: string;
  description: string;
  category?: "images" | "video";
  tag?: string;
  coverUrl?: string | null;
  videoUrl?: string | null;
  videoPreviewUrl?: string | null;
};

export function ImageAgentTagChips({
  value,
  onChange,
  labels,
}: {
  value: ImageAgentTag;
  onChange: (tag: ImageAgentTag) => void;
  labels: Record<ImageAgentTag, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {IMAGE_AGENT_TAGS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors",
            value === item ? "border-accent-brand bg-accent-brand text-white" : "border-border bg-surface text-steel hover:text-text",
          )}
        >
          #{labels[item]}
        </button>
      ))}
    </div>
  );
}

type AgentsTemplatesGalleryProps = {
  tab: StudioGalleryTab;
  onTabChange: (tab: StudioGalleryTab) => void;
  agents: GalleryAgent[];
  selectedAgentId?: string;
  selectedTemplateId?: string;
  onChooseAgent: (id: string) => void;
  onChooseVideoAgent?: (id: string) => void;
  onChooseTemplate: (id: string) => void;
  onClose?: () => void;
  variant?: "dialog" | "page";
};

export function AgentsTemplatesGallery({
  tab,
  onTabChange,
  agents,
  selectedAgentId,
  selectedTemplateId,
  onChooseAgent,
  onChooseVideoAgent,
  onChooseTemplate,
  onClose,
  variant = "dialog",
}: AgentsTemplatesGalleryProps) {
  const { locale } = useLocale();
  const copy = studioGalleryCopy(locale);
  const [tag, setTag] = useState<ImageAgentTag>("all");
  const [videoTag, setVideoTag] = useState<VideoAgentFilterTag>("all");
  const [openVideo, setOpenVideo] = useState<{ src: string; title: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filteredAgents = useMemo(
    () => [...agents.filter((agent) => agent.category !== "video" && imageAgentMatchesTag(agent.id, tag))].reverse(),
    [agents, tag],
  );
  const filteredVideoAgents = useMemo(
    () => [...agents.filter((agent) => agent.category === "video" && (videoTag === "all" || agent.tag === videoTag))].reverse(),
    [agents, videoTag],
  );
  const activeAgents = tab === "video" ? filteredVideoAgents : filteredAgents;
  const pagedAgents = useMemo(
    () => (variant === "page" ? activeAgents.slice(0, visibleCount) : activeAgents),
    [activeAgents, variant, visibleCount],
  );
  const hasMore = variant === "page" && visibleCount < activeAgents.length;

  void selectedTemplateId;
  void onChooseTemplate;

  useEffect(() => {
    if (variant !== "page" || !hasMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + GALLERY_PAGE_SIZE, activeAgents.length));
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeAgents.length, hasMore, variant]);

  useEffect(() => {
    if (variant !== "dialog" || !onClose) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const releaseScrollLock = acquireScrollLock();
    return () => {
      document.removeEventListener("keydown", onKey);
      releaseScrollLock();
    };
  }, [onClose, variant]);

  const tabs: StudioGalleryTab[] = ["photo", "video"];
  const body = (
    <>
      <div className={cn("flex items-center justify-between gap-3", tab === "photo" ? "mb-3" : variant === "page" ? "mb-8" : "mb-6")}>
        <div className="flex min-w-0 flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setVisibleCount(GALLERY_PAGE_SIZE); onTabChange(item); }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                tab === item ? "border-accent-brand bg-accent-brand text-white" : "border-border bg-surface text-steel hover:text-text",
              )}
            >
              {copy.tab[item]}
            </button>
          ))}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-border hover:bg-mist" aria-label={copy.close}>
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <div hidden={tab !== "photo"} className={variant === "page" ? "mb-6" : "mb-4"}>
        <ImageAgentTagChips value={tag} onChange={(next) => { setTag(next); setVisibleCount(GALLERY_PAGE_SIZE); }} labels={copy.tag} />
      </div>

      <div hidden={tab !== "video"} className={variant === "page" ? "mb-6" : "mb-4"}>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...VIDEO_AGENT_TAGS] as VideoAgentFilterTag[]).map((item) => (
            <button key={item} type="button" onClick={() => { setVideoTag(item); setVisibleCount(GALLERY_PAGE_SIZE); }} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors", videoTag === item ? "border-accent-brand bg-accent-brand text-white" : "border-border bg-surface text-steel hover:text-text")}>
              #{videoAgentTagLabel(locale, item)}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", variant === "page" && "overflow-visible")}>
        <div>
          {pagedAgents.length ? (
            <>
              <div className={cn("grid", variant === "dialog" ? "grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4")}>
                {pagedAgents.map((agent) => {
                  const videoCopy = agent.category === "video" ? videoAgentCopy(agent.id, locale) : null;
                  const title = videoCopy?.name ?? (agentName(agent.id, locale) || agent.name);
                  const description = videoCopy?.description ?? (agentDescription(agent.id, locale) || agent.description);
                  return (
                    <AgentPreviewCard
                      key={agent.id}
                      agentId={agent.id}
                      title={title}
                      description={description}
                      useLabel={copy.useAgent}
                      tag={agent.category === "video" && agent.tag ? videoAgentTagLabel(locale, agent.tag as VideoAgentFilterTag) : undefined}
                      coverSrc={agent.coverUrl ?? undefined}
                      videoPreviewSrc={agent.videoPreviewUrl ?? undefined}
                      videoFullSrc={agent.videoUrl ?? undefined}
                      onOpenVideo={(src, videoTitle) => setOpenVideo({ src, title: videoTitle })}
                      onUse={() => agent.category === "video" ? onChooseVideoAgent?.(agent.id) : onChooseAgent(agent.id)}
                      className={selectedAgentId === agent.id ? "ring-2 ring-accent-brand ring-offset-2 ring-offset-bg" : undefined}
                    />
                  );
                })}
              </div>
              {hasMore ? <div ref={loadMoreRef} className="h-8" aria-hidden /> : null}
            </>
          ) : (
            <p className="py-16 text-center text-sm text-steel">{copy.emptyTag}</p>
          )}
        </div>
      </div>

      {openVideo ? (
        <div className="fixed inset-0 z-[420] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={openVideo.title} onClick={() => setOpenVideo(null)}>
          <div className="relative max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <video src={openVideo.src} controls autoPlay playsInline className="max-h-[92dvh] w-full object-contain" />
            <button type="button" onClick={() => setOpenVideo(null)} aria-label={copy.close} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/65 text-white hover:bg-black/85"><X className="size-5" /></button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (variant === "page") {
    return <section className="mx-auto flex max-w-6xl flex-col px-5 py-12 sm:px-8 sm:py-16">{body}</section>;
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-bg p-6" role="dialog" aria-modal="true" aria-label={copy.tab[tab]}>
      {body}
    </div>
  );
}
