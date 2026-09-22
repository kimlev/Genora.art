"use client";

import { BeforeAfterSlider } from "@/components/agents/before-after-slider";
import { useLocale } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";
import { AGENT_NAME_MAX } from "@/lib/agent-context";
import {
  agentPreviewKind,
  cardComparePreviewAssets,
  cardStillPreviewSrc,
  compareCornerLabels,
} from "@/lib/agent-preview";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

type AgentPreviewCardProps = {
  agentId: string;
  title: string;
  description: string;
  useLabel: string;
  href?: string;
  hrefTarget?: string;
  hrefRel?: string;
  onUse?: () => void;
  disabled?: boolean;
  leading?: ReactNode;
  headingAs?: "h2" | "h3";
  tag?: string;
  coverSrc?: string;
  videoPreviewSrc?: string;
  videoFullSrc?: string;
  onOpenVideo?: (src: string, title: string) => void;
  className?: string;
};

export function AgentPreviewCard({
  agentId,
  title,
  description,
  useLabel,
  href,
  hrefTarget,
  hrefRel,
  onUse,
  disabled,
  leading,
  headingAs: Heading = "h3",
  tag,
  coverSrc,
  videoPreviewSrc,
  videoFullSrc,
  onOpenVideo,
  className,
}: AgentPreviewCardProps) {
  const { locale } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const kind = agentPreviewKind(agentId);
  const labels = compareCornerLabels(locale);
  const oneLineTitle = title.slice(0, AGENT_NAME_MAX);

  const useButtonClass =
    "group/use pointer-events-auto inline-flex size-10 items-center justify-center rounded-lg bg-accent text-white shadow-[0_0_0_0_transparent] transition-[transform,box-shadow,filter] duration-200 ease-out hover:scale-[1.08] hover:brightness-125 hover:shadow-[0_0_22px_color-mix(in_oklch,var(--accent)_72%,transparent)] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 disabled:opacity-40";
  const useArrowClass =
    "size-4 transition-transform duration-200 ease-out group-hover/use:translate-x-0.5 group-hover/use:-translate-y-0.5 motion-reduce:group-hover/use:translate-x-0 motion-reduce:group-hover/use:translate-y-0";
  const subtitleOverlayClass =
    "rounded-lg bg-[color-mix(in_srgb,#2a3a52_78%,transparent)] px-2.5 py-1.5 text-[calc((0.875rem/1.8)*1.5)] text-white";

  return (
    <article
      onMouseEnter={() => { if (videoPreviewSrc) void videoRef.current?.play().catch(() => undefined); }}
      onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
      className={cn(
        "relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-mist [container-type:size]",
        className,
      )}
    >
      {leading}
      <div
        className={cn("absolute inset-0", videoPreviewSrc && onOpenVideo && "cursor-zoom-in")}
        onClick={() => { if (videoFullSrc && onOpenVideo) onOpenVideo(videoFullSrc, oneLineTitle); }}
        role={videoPreviewSrc && onOpenVideo ? "button" : undefined}
        tabIndex={videoPreviewSrc && onOpenVideo ? 0 : undefined}
        onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && videoFullSrc && onOpenVideo) onOpenVideo(videoFullSrc, oneLineTitle); }}
      >
        {videoPreviewSrc ? (
          <video ref={videoRef} src={videoPreviewSrc} poster={coverSrc} muted loop playsInline preload="metadata" className="size-full object-cover" />
        ) : kind === "compare" ? (
          <BeforeAfterSlider
            beforeSrc={cardComparePreviewAssets(agentId).before}
            afterSrc={cardComparePreviewAssets(agentId).after}
            beforeAlt={`${oneLineTitle}: ${labels.before}`}
            afterAlt={`${oneLineTitle}: ${labels.after}`}
            label={locale === "ru" ? "До и после" : "Before and after"}
          />
        ) : kind === "photo" || coverSrc ? (
          <img src={coverSrc ?? cardStillPreviewSrc(agentId)} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="size-full bg-[color-mix(in_oklch,var(--accent)_8%,var(--mist))]" />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-2.5">
        <div className="group/title pointer-events-auto flex w-full flex-col items-start text-white">
          <Heading className="max-w-full truncate rounded-lg bg-black/60 px-2.5 py-1.5 text-[calc((1rem/1.4)*1.3/1.1)] font-semibold leading-none">
            {oneLineTitle}
          </Heading>
          <p className="mt-0.5 hidden w-full min-w-0 group-hover/title:block">
            <span className={cn(subtitleOverlayClass, "block max-h-[min(16rem,calc(100cqh-3.5rem))] overflow-y-auto break-words leading-snug whitespace-normal")}>
              {description}
            </span>
          </p>
        </div>
        {kind === "compare" ? (
          <div className="mt-2 flex justify-between">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {labels.before}
            </span>
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {labels.after}
            </span>
          </div>
        ) : null}
      </div>

      {tag ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10">
          <span className={cn(subtitleOverlayClass, "leading-none")}>{tag}</span>
        </div>
      ) : null}

      <div className="group/visual absolute inset-x-0 bottom-0 z-10 h-1/2">
        <div className="absolute right-3 bottom-3 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/visual:opacity-100">
          {href ? (
            <Link
              href={href}
              target={hrefTarget}
              rel={hrefRel}
              aria-label={useLabel}
              className={useButtonClass}
            >
              <ArrowUpRight className={useArrowClass} />
            </Link>
          ) : (
            <button
              type="button"
              aria-label={useLabel}
              disabled={disabled}
              onClick={(event) => { event.stopPropagation(); onUse?.(); }}
              className={useButtonClass}
            >
              <ArrowUpRight className={useArrowClass} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
