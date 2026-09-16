"use client";

import { SeoArticle } from "@/components/catalog/seo-article";
import { useLocale } from "@/components/providers/locale-provider";
import { IMAGE_EXAMPLE_PROVIDERS, imageExampleThumb, imageExamplesForModels, type ImageExample } from "@/lib/catalog/image-examples";
import { catalogPagesCopy } from "@/lib/i18n/copy/catalog-pages";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, X } from "lucide-react";
import { useMemo, useState } from "react";

const BENTO = [
  "md:col-span-2 md:row-span-2 min-h-[240px]",
  "md:col-span-2 md:row-span-1 min-h-[140px]",
  "md:col-span-4 md:row-span-3 min-h-[380px]",
  "md:col-span-4 md:row-span-2 min-h-[240px]",
  "md:col-span-2 md:row-span-1 min-h-[140px]",
  "md:col-span-2 md:row-span-1 min-h-[140px]",
  "md:col-span-2 md:row-span-3 min-h-[380px]",
];

function hueFrom(value: string): number {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function ExampleVisual({
  example,
  className,
  src,
  priority = false,
}: {
  example: ImageExample;
  className?: string;
  src: string;
  priority?: boolean;
}) {
  const hue = hueFrom(`${example.modelId}-${example.style}`);
  return (
    <div className={cn("absolute inset-0 bg-mist", className)}>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(145deg, oklch(0.78 0.12 ${hue}), oklch(0.28 0.04 ${hue}))` }}
      />
      <img
        src={src}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active ? "border-[#FF6F00] bg-[#FF6F00] text-white" : "border-border bg-surface text-steel hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function ImageExamplesPage() {
  const { locale } = useLocale();
  const copy = catalogPagesCopy(locale);
  const [provider, setProvider] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const examples = useMemo(() => imageExamplesForModels([], locale), [locale]);
  const visible = useMemo(
    () => (provider === "all" ? examples : examples.filter((example) => example.providerLabel === provider)),
    [examples, provider],
  );
  const opened = visible.find((example) => example.id === openId) ?? null;

  const copyPrompt = async (example: ImageExample) => {
    await navigator.clipboard.writeText(example.prompt).catch(() => undefined);
    setCopied(example.id);
    window.setTimeout(() => setCopied((current) => (current === example.id ? null : current)), 1600);
  };

  return (
    <>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-5xl">{copy.imagesTitle}</h1>
          <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{copy.imagesLead}</p>
        </div>

        <div className="mt-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-steel">{copy.filterProvider}</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={provider === "all"} onClick={() => setProvider("all")}>{copy.filterAll}</Chip>
            {IMAGE_EXAMPLE_PROVIDERS.map((name) => (
              <Chip key={name} active={provider === name} onClick={() => setProvider(name)}>{name}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 auto-rows-[minmax(200px,auto)] grid-flow-dense gap-4 md:grid-cols-6">
          {visible.map((example, index) => {
            const open = Boolean(expanded[example.id]);
            return (
              <article
                key={example.id}
                className={cn(
                  "relative overflow-hidden rounded-[26px] border border-border bg-surface [content-visibility:auto] [contain-intrinsic-size:280px]",
                  example.span ?? BENTO[index % BENTO.length],
                )}
              >
                <button type="button" onClick={() => setOpenId(example.id)} className="absolute inset-0" aria-label={example.modelLabel}>
                  <ExampleVisual example={example} src={imageExampleThumb(example.image)} priority={index < 4} />
                </button>
                <span className="pointer-events-none absolute start-3 top-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  {example.modelLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded((current) => ({ ...current, [example.id]: !current[example.id] }))}
                  className="absolute start-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60"
                >
                  {open ? copy.hidePrompt : copy.showPrompt}
                </button>
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-14 pt-10",
                    open ? "pointer-events-auto max-h-[60%] overflow-y-auto" : "pointer-events-none",
                  )}
                >
                  {open ? <p className="text-sm leading-relaxed text-white">{example.prompt}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label={copy.copyPrompt}
                  onClick={() => void copyPrompt(example)}
                  className="absolute end-3 bottom-3 z-10 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
                >
                  {copied === example.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {opened ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-[28px] bg-surface"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" aria-label={copy.closePreview} onClick={() => setOpenId(null)} className="absolute end-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/45 text-white">
                <X className="size-4" />
              </button>
              <div className="relative aspect-[16/10] w-full">
                <ExampleVisual example={opened} src={opened.image} priority />
                <span className="absolute start-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">{opened.modelLabel}</span>
              </div>
              <p className="max-h-40 overflow-y-auto p-5 text-sm leading-relaxed text-steel">{opened.prompt}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SeoArticle articleId="images" />
    </>
  );
}
