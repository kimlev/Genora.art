"use client";

import { ProviderLogo } from "@/components/chat/provider-logo";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { musicTileTone } from "@/lib/catalog/music-guide";
import {
  imageModelsFromCatalog,
  matchesQuery,
  mediaModelsFromCatalog,
  popularModels,
  textModelsFromCatalog,
  type PublicModel,
} from "@/lib/catalog/public-models";
import { catalogPagesCopy, publicModelDescription } from "@/lib/i18n/copy/catalog-pages";
import { videoTagLabel } from "@/lib/i18n/copy/video-pricing";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/locale-link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ImageCatalogRow = { id: string; label: string; provider: string; provider_label: string; tags?: string[] };

function ModelCard({ model, description, openLabel, locale }: { model: PublicModel; description: string; openLabel: string; locale: Locale }) {
  const tone = musicTileTone(model.id);
  return (
    <Link
      href={model.href}
      aria-label={`${openLabel}: ${model.name}`}
      className={cn("group flex h-full flex-col rounded-2xl border p-5 transition-all hover:shadow-[0_20px_60px_-40px_color-mix(in_oklch,var(--accent)_40%,transparent)]", tone.card)}
    >
      <div className={cn("mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-steel", tone.title)}>
        <ProviderLogo provider={model.provider} className="size-7" />
        <span>{model.provider}</span>
      </div>
      <h3 className={cn("text-lg font-semibold tracking-tight text-text", tone.title)}>{model.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-steel">{description}</p>
      {model.kind !== "video" && model.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {model.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-mist px-2 py-0.5 text-[11px] font-medium text-steel">
              {videoTagLabel(locale, tag)}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

function ModelGroup({
  id,
  title,
  models,
  locale,
  openLabel,
}: {
  id: string;
  title: string;
  models: PublicModel[];
  locale: Parameters<typeof publicModelDescription>[0];
  openLabel: string;
}) {
  if (!models.length) return null;
  return (
    <section id={id} className="mt-12 scroll-mt-[76px]">
      <h2 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{title} ({models.length.toLocaleString(locale)})</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <ModelCard
            key={`${title}-${model.kind}-${model.id}`}
            model={model}
            locale={locale}
            openLabel={openLabel}
            description={publicModelDescription(locale, model.id, model.kind)}
          />
        ))}
      </div>
    </section>
  );
}

export function ModelsCatalogPage() {
  const { locale } = useLocale();
  const copy = catalogPagesCopy(locale);
  const { models } = useCatalog();
  const [query, setQuery] = useState("");
  const [imageRows, setImageRows] = useState<ImageCatalogRow[]>([]);
  const [videoRows, setVideoRows] = useState<ImageCatalogRow[]>([]);
  const [musicRows, setMusicRows] = useState<ImageCatalogRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = (path: string, setRows: (rows: ImageCatalogRow[]) => void) =>
      fetch(path)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { models?: ImageCatalogRow[] } | null) => {
          if (active && payload?.models?.length) setRows(payload.models);
        })
        .catch(() => undefined);
    void load("/api/images/catalog", setImageRows);
    void load("/api/video/catalog", setVideoRows);
    void load("/api/music/catalog", setMusicRows);
    return () => {
      active = false;
    };
  }, []);

  const text = useMemo(() => textModelsFromCatalog(models), [models]);
  const images = useMemo(() => imageModelsFromCatalog(imageRows), [imageRows]);
  const video = useMemo(() => mediaModelsFromCatalog(videoRows, "video"), [videoRows]);
  const songs = useMemo(() => mediaModelsFromCatalog(musicRows, "music"), [musicRows]);
  const filtered = useMemo(() => {
    const all = { popular: popularModels(text), images, text, video, audio: songs };
    return {
      popular: all.popular.filter((model) => matchesQuery(model, query)),
      images: all.images.filter((model) => matchesQuery(model, query)),
      text: all.text.filter((model) => matchesQuery(model, query)),
      video: all.video.filter((model) => matchesQuery(model, query)),
      audio: all.audio.filter((model) => matchesQuery(model, query)),
    };
  }, [images, query, songs, text, video]);
  const empty = !filtered.popular.length && !filtered.images.length && !filtered.text.length && !filtered.video.length && !filtered.audio.length;

  return (
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-5xl">{copy.modelsTitle}</h1>
          <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{copy.modelsLead}</p>
          <label className="relative mt-8 block">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-steel" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAria}
              className="h-12 w-full rounded-2xl border border-border bg-surface ps-11 pe-4 text-sm text-text outline-none ring-accent-brand/30 placeholder:text-steel focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-10">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-steel">{copy.jumpLabel}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: "group-popular", label: copy.jumpPopular },
              { id: "group-text", label: copy.jumpText },
              { id: "group-images", label: copy.jumpImages },
              { id: "group-video", label: copy.jumpVideo },
              { id: "group-audio", label: copy.jumpSongs },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-steel transition-colors hover:border-[#FF6F00] hover:bg-[#FF6F00] hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {empty ? <p className="mt-16 text-center text-sm text-steel">{copy.empty}</p> : null}
        <ModelGroup id="group-popular" title={copy.groupPopular} models={filtered.popular} locale={locale} openLabel={copy.openModel} />
        <ModelGroup id="group-text" title={copy.groupText} models={filtered.text} locale={locale} openLabel={copy.openModel} />
        <ModelGroup id="group-images" title={copy.groupImages} models={filtered.images} locale={locale} openLabel={copy.openModel} />
        <ModelGroup id="group-video" title={copy.groupVideo} models={filtered.video} locale={locale} openLabel={copy.openModel} />
        <ModelGroup id="group-audio" title={copy.groupSongs || copy.groupAudio} models={filtered.audio} locale={locale} openLabel={copy.openModel} />
      </div>
  );
}
