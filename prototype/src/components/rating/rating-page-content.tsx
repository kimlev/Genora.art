"use client";

import { ProviderLogo } from "@/components/chat/provider-logo";
import { ProviderMenuSelect } from "@/components/chat/provider-menu-select";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useCatalog, type CatalogModel } from "@/components/providers/catalog-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { SelectMenu } from "@/components/ui/select-menu";
import { imageRatingFor } from "@/lib/catalog/image-rating-seed";
import { musicRatingFor } from "@/lib/catalog/music-rating-seed";
import { videoRatingFor } from "@/lib/catalog/video-rating-seed";
import { isImageCatalogModel, isMusicCatalogModel, isVideoCatalogModel } from "@/lib/catalog/model-kind";
import { getLocaleOption } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type TypeFilter = "text" | "photo" | "video" | "music" | "favorites";
type SortKey = "total" | "score" | "votes";
type SortDirection = "desc" | "asc";

type RatingRow = {
  id: string;
  name: string;
  provider: string;
  score: number;
  votes: number;
};

const filterSelectClass = "h-10 text-sm normal-case tracking-normal";

export function RatingPageContent({ articleSlot }: { articleSlot?: ReactNode }) {
  const t = useT();
  const { locale } = useLocale();
  const { user, ready } = useAuth();
  const { models } = useCatalog();
  const [personalRating, setPersonalRating] = useState<{ userId: string; models: CatalogModel[] } | null>(null);
  const [imageRows, setImageRows] = useState<Array<{ id: string; label: string; provider: string; provider_label: string }>>([]);
  const [musicRows, setMusicRows] = useState<Array<{ id: string; label: string; provider: string; provider_label: string }>>([]);
  const [videoRows, setVideoRows] = useState<Array<{ id: string; label: string; provider: string; provider_label: string }>>([]);
  const refreshPersonalRating = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/rating", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json().catch(() => null) as { models?: CatalogModel[] } | null;
    if (data?.models) setPersonalRating({ userId: user.id, models: data.models });
  }, [user]);
  useEffect(() => {
    if (!ready || !user) return;
    const initial = window.setTimeout(() => void refreshPersonalRating(), 0);
    const refresh = () => void refreshPersonalRating();
    window.addEventListener("genora-feedback-change", refresh);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("genora-feedback-change", refresh);
    };
  }, [ready, refreshPersonalRating, user]);
  useEffect(() => {
    let active = true;
    void fetch("/api/images/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { models?: Array<{ id: string; label: string; provider: string; provider_label: string }> } | null) => {
        if (active && payload?.models?.length) setImageRows(payload.models);
      })
      .catch(() => undefined);
    void fetch("/api/music/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { models?: Array<{ id: string; label: string; provider: string; provider_label: string }> } | null) => {
        if (active && payload?.models?.length) setMusicRows(payload.models);
      })
      .catch(() => undefined);
    void fetch("/api/video/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { models?: Array<{ id: string; label: string; provider: string; provider_label: string }> } | null) => {
        if (active && payload?.models?.length) setVideoRows(payload.models);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const textModels = useMemo(() => {
    const source = user
      ? (personalRating?.userId === user.id ? personalRating.models : models.map((model) => ({ ...model, score: 0, votes: 0, tokensUsed: 0 })))
      : models;
    return source.filter((model) => !isImageCatalogModel(model) && !isMusicCatalogModel(model) && !isVideoCatalogModel(model)).map((model): RatingRow => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      score: model.score,
      votes: model.votes,
    }));
  }, [models, personalRating, user]);
  const photoModels = useMemo((): RatingRow[] => {
    if (user && personalRating?.userId === user.id) {
      return personalRating.models.filter((model) => isImageCatalogModel(model)).map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        score: model.score,
        votes: model.votes,
      }));
    }
    return imageRows.map((model) => {
      const seed = imageRatingFor(model.id);
      return {
        id: model.id,
        name: model.label,
        provider: model.provider_label || model.provider,
        score: seed.score,
        votes: seed.votes,
      };
    });
  }, [imageRows, personalRating, user]);
  const musicModels = useMemo((): RatingRow[] => {
    if (user && personalRating?.userId === user.id) {
      return personalRating.models.filter((model) => isMusicCatalogModel(model)).map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        score: model.score,
        votes: model.votes,
      }));
    }
    return musicRows.map((model) => {
      const seed = musicRatingFor(model.id);
      return {
        id: `${model.provider}-${model.id}`,
        name: model.label,
        provider: model.provider_label || model.provider,
        score: seed.score,
        votes: seed.votes,
      };
    });
  }, [musicRows, personalRating, user]);
  const videoModels = useMemo((): RatingRow[] => {
    if (user && personalRating?.userId === user.id) {
      return personalRating.models.filter((model) => isVideoCatalogModel(model)).map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        score: model.score,
        votes: model.votes,
      }));
    }
    return videoRows.map((model) => {
      const seed = videoRatingFor(model.id);
      return {
        id: `${model.provider}-${model.id}`,
        name: model.label,
        provider: model.provider_label || model.provider,
        score: seed.score,
        votes: seed.votes,
      };
    });
  }, [personalRating, user, videoRows]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("text");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [provider, setProvider] = useState("all");

  const pool = typeFilter === "photo"
    ? photoModels
    : typeFilter === "music"
      ? musicModels
      : typeFilter === "video"
        ? videoModels
        : typeFilter === "text"
          ? textModels
          : typeFilter === "favorites"
            ? [...photoModels, ...musicModels, ...videoModels, ...textModels].filter((item) => item.score > 0 || item.votes > 0)
            : [];
  const providers = [...new Set(pool.map((item) => item.provider))].sort((left, right) => left.localeCompare(right, getLocaleOption(locale).intl));
  const numberFormat = new Intl.NumberFormat(getLocaleOption(locale).intl);
  const ranked = useMemo(() => {
    const filtered = pool.filter((model) => provider === "all" || model.provider === provider);
    return filtered.sort((left, right) => {
      const leftValue = sortKey === "total" ? left.score + left.votes : left[sortKey];
      const rightValue = sortKey === "total" ? right.score + right.votes : right[sortKey];
      return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
    });
  }, [direction, pool, provider, sortKey]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">{user ? t.rating.myTitle : t.rating.pageTitle}</h1>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-steel">{user ? t.rating.mySubtitle : t.rating.pageSubtitle}</p>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-mist/45 p-3 lg:flex-row lg:items-center">
        <p className="shrink-0 text-sm font-semibold text-text">{t.rating.bestFor}</p>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
          <SelectMenu
            ariaLabel={t.rating.filterType}
            value={typeFilter}
            options={[
              { value: "text", label: t.rating.filterTypeText },
              { value: "photo", label: t.rating.filterTypePhoto },
              { value: "video", label: t.rating.filterTypeVideo },
              { value: "music", label: t.rating.filterTypeMusic },
              { value: "favorites", label: t.rating.filterTypeFavorites },
            ]}
            onChange={(next) => {
              setTypeFilter(next as TypeFilter);
              setProvider("all");
              setSortKey("total");
              setDirection("desc");
            }}
            className={filterSelectClass}
          />
          <ProviderMenuSelect
            label={t.rating.filterProvider}
            value={provider}
            options={[{ value: "all", label: t.rating.filterProviderAll }, ...providers.map((value) => ({ value, label: value }))]}
            onChange={setProvider}
            className={filterSelectClass}
          />
          <SelectMenu
            ariaLabel={t.rating.sortByScore}
            value={sortKey === "score" ? direction : "idle"}
            placeholder={t.rating.sortByScore}
            options={[
              { value: "desc", label: `${t.rating.sortByScore} ↑` },
              { value: "asc", label: `${t.rating.sortByScore} ↓` },
            ]}
            onChange={(next) => {
              setSortKey("score");
              setDirection(next === "asc" ? "asc" : "desc");
            }}
            className={filterSelectClass}
          />
          <SelectMenu
            ariaLabel={t.rating.sortByVotes}
            value={sortKey === "votes" ? direction : "idle"}
            placeholder={t.rating.sortByVotes}
            options={[
              { value: "desc", label: `${t.rating.sortByVotes} ↑` },
              { value: "asc", label: `${t.rating.sortByVotes} ↓` },
            ]}
            onChange={(next) => {
              setSortKey("votes");
              setDirection(next === "asc" ? "asc" : "desc");
            }}
            className={filterSelectClass}
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead><tr className="border-b border-border bg-mist/50 text-left text-xs uppercase tracking-wide text-steel">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t.rating.columnModel}</th>
              <th className="px-4 py-3 text-right font-medium">{t.rating.columnScore}</th>
              <th className="px-4 py-3 text-right font-medium">{t.rating.columnVotes}</th>
            </tr></thead>
            <tbody>
              {ranked.map((model, index) => (
                <tr key={model.id} className={cn("border-b border-border/60 last:border-0", index < 3 && "bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]")}>
                  <td className="px-4 py-3 tabular-nums text-steel">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo provider={model.provider} className="size-7" />
                      <span>
                        <span className="block font-medium text-text">{model.name}</span>
                        <span className="block text-xs text-steel">{model.provider}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">{model.score}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-steel">{numberFormat.format(model.votes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-xs text-steel">{user ? t.rating.personalNote : t.rating.publicNote}</p>
      {articleSlot}
    </div>
  );
}
