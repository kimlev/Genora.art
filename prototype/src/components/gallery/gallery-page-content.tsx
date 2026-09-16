"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useImageHistory } from "@/components/providers/image-history-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/layout/confirm-action-dialog";
import { MediaPromptDialog } from "@/components/images/media-prompt-dialog";
import { Link } from "@/components/ui/locale-link";
import { SelectMenu } from "@/components/ui/select-menu";
import { displayMusicTitle, musicDbId } from "@/lib/catalog/music-studio";
import { readGalleryFavorites, subscribeGalleryFavorites, toggleGalleryFavorite, writeGalleryFavorites } from "@/lib/gallery-favorites";
import { galleryWorkFavoriteId, galleryWorkIsFavorite, normalizeGalleryFavoriteIds } from "@/lib/gallery-work-favorites";
import { saveModelFeedback, useModelFeedback } from "@/lib/model-feedback";
import { galleryCopy } from "@/lib/i18n/copy/gallery-copy";
import { galleryUiCopy } from "@/lib/i18n/copy/gallery-ui-copy";
import { deleteConfirmationCopy } from "@/lib/i18n/copy/delete-confirmation";
import { mediaTitleCopy } from "@/lib/i18n/copy/media-title";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { videoStudioUiCopy } from "@/lib/i18n/copy/video-studio-ui-copy";
import { untitledTrackLabel } from "@/lib/i18n/copy/untitled-track-copy";
import { getLocaleOption } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MusicPlayer } from "@/components/music/music-player";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { DownloadSizeAction } from "@/components/ui/download-size-action";
import { PromptCopyButton } from "@/components/ui/prompt-copy-button";
import { formatTokensAsCredits } from "@/lib/credits";
import { Archive, Eye, Grid2x2, Heart, ImageIcon, LayoutList, LayoutGrid, Music2, Play, Search, Share2, ThumbsUp, Trash2, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type WorkKind = "photo" | "video" | "music" | "song";
type Filter = "all" | WorkKind | "favorites" | "archive";
type SortOrder = "newest" | "oldest";
type ViewMode = "grid" | "list";

type GalleryWork = {
  id: string;
  kind: WorkKind;
  title: string;
  model: string;
  modelId?: string;
  rateId?: string;
  requestId?: string;
  mediaTitle?: string;
  url: string;
  previewUrl?: string;
  coverUrl?: string | null;
  createdAt: string;
  prompt: string;
  durationSec?: number | null;
  size?: string;
  format?: string;
  billedTokens?: number;
};

function kindLabel(kind: WorkKind, copy: ReturnType<typeof galleryCopy>) {
  if (kind === "photo") return copy.kindPhoto;
  if (kind === "video") return copy.kindVideo;
  if (kind === "music") return copy.kindMusic;
  return copy.kindSong;
}

function IconAction({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded-md text-steel transition-colors hover:bg-mist hover:text-text",
        active && "text-accent-brand",
      )}
    >
      {children}
    </button>
  );
}

export function GalleryPageContent() {
  const t = useT();
  const { locale } = useLocale();
  const copy = galleryCopy(locale);
  const ui = galleryUiCopy(locale);
  const deleteCopy = deleteConfirmationCopy(locale);
  const appCopy = apiAppCopy(locale);
  const { user, ready } = useAuth();
  const { conversations, loading, deleteGeneration, renameMedia } = useImageHistory();
  const feedback = useModelFeedback();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [musicWorks, setMusicWorks] = useState<GalleryWork[]>([]);
  const [archiveWorks, setArchiveWorks] = useState<GalleryWork[]>([]);
  const [preview, setPreview] = useState<GalleryWork | null>(null);
  const [promptWork, setPromptWork] = useState<GalleryWork | null>(null);
  const [playing, setPlaying] = useState<GalleryWork | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalleryWork | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    const refresh = () => setFavorites(readGalleryFavorites(user.id));
    refresh();
    return subscribeGalleryFavorites(refresh);
  }, [user]);
  const mapMusic = useCallback((tracks: Array<{ id: string; requestId?: string; title: string; mode: string; provider?: string; modelId?: string; modelLabel: string; url: string; coverUrl?: string | null; createdAt: string; prompt?: string }>) => {
    const untitled = untitledTrackLabel(locale);
    return tracks.map((track): GalleryWork => ({
      id: track.id,
      kind: track.mode === "instrumental" ? "music" : "song",
      title: displayMusicTitle(track.title, track.prompt ?? "", track.requestId ?? track.id, untitled),
      model: track.modelLabel,
      modelId: track.provider && track.modelId ? musicDbId(track.provider, track.modelId) : track.modelId,
      rateId: track.id,
      url: track.url,
      coverUrl: track.coverUrl || null,
      createdAt: track.createdAt,
      prompt: track.prompt ?? "",
    }));
  }, [locale]);

  const loadGalleryWorks = useCallback(async () => {
    if (!user) return;
    const [musicRes, archiveMusicRes, archiveImageRes] = await Promise.all([
      fetch("/api/music/generations", { cache: "no-store" }),
      fetch("/api/music/generations?archived=1", { cache: "no-store" }),
      fetch("/api/images/generations?archived=1", { cache: "no-store" }),
    ]);
    const musicPayload = musicRes.ok ? await musicRes.json().catch(() => null) as { tracks?: Parameters<typeof mapMusic>[0] } | null : null;
    const archiveMusicPayload = archiveMusicRes.ok ? await archiveMusicRes.json().catch(() => null) as { tracks?: Parameters<typeof mapMusic>[0] } | null : null;
    const archiveImagePayload = archiveImageRes.ok ? await archiveImageRes.json().catch(() => null) as { conversations?: Array<{ title: string; generations: Array<{ requestId: string; modelId: string; modelLabel: string; prompt: string; createdAt: string; kind?: "photo" | "video"; durationSec?: number | null; size?: string; format?: string; billedTokens?: number; images: Array<{ id: string; url: string; previewUrl?: string; title?: string }> }> }> } | null : null;
    setMusicWorks(mapMusic(musicPayload?.tracks ?? []));
    const archivedPhotos: GalleryWork[] = (archiveImagePayload?.conversations ?? []).flatMap((conversation) =>
      conversation.generations.flatMap((generation) =>
        generation.images.map((image) => ({
          id: `${generation.requestId}-${image.id}`,
          requestId: generation.requestId,
          kind: generation.kind === "video" ? "video" as const : "photo" as const,
          title: image.title || generation.prompt || conversation.title,
          mediaTitle: image.title ?? "",
          model: generation.modelLabel,
          modelId: generation.modelId,
          rateId: image.id,
          url: image.url,
          previewUrl: image.previewUrl,
          createdAt: generation.createdAt,
          prompt: generation.prompt,
          durationSec: generation.kind === "video" ? generation.durationSec : undefined,
          size: generation.size,
          format: generation.format,
          billedTokens: generation.billedTokens,
        })),
      ),
    );
    setArchiveWorks([...mapMusic(archiveMusicPayload?.tracks ?? []), ...archivedPhotos]);
  }, [mapMusic, user]);

  useEffect(() => {
    if (!user) return;
    void loadGalleryWorks();
    const refresh = () => void loadGalleryWorks();
    window.addEventListener("genora-gallery-change", refresh);
    return () => window.removeEventListener("genora-gallery-change", refresh);
  }, [loadGalleryWorks, user]);

  const works = useMemo<GalleryWork[]>(() => [
    ...conversations.flatMap((conversation) =>
      conversation.generations.flatMap((generation) =>
        generation.images.map((image) => ({
          id: `${generation.requestId}-${image.id}`,
          requestId: generation.requestId,
          kind: generation.kind === "video" ? "video" as const : "photo" as const,
          title: image.title || generation.prompt || conversation.title,
          mediaTitle: image.title ?? "",
          model: generation.modelLabel,
          modelId: generation.modelId,
          rateId: image.id,
          url: image.url,
          previewUrl: image.previewUrl,
          createdAt: generation.createdAt,
          prompt: generation.prompt,
          durationSec: generation.kind === "video" ? generation.durationSec : undefined,
          size: generation.size,
          format: generation.format,
          billedTokens: generation.billedTokens,
        })),
      ),
    ),
    ...musicWorks,
  ], [conversations, musicWorks]);

  useEffect(() => {
    if (!user || !works.length) return;
    const current = readGalleryFavorites(user.id);
    const normalized = normalizeGalleryFavoriteIds(current, works);
    if (normalized.length === current.length && normalized.every((id, index) => id === current[index])) return;
    writeGalleryFavorites(user.id, normalized);
  }, [user, works]);

  const counts = useMemo(() => ({
    all: works.length,
    photo: works.filter((item) => item.kind === "photo").length,
    video: works.filter((item) => item.kind === "video").length,
    music: works.filter((item) => item.kind === "music").length,
    song: works.filter((item) => item.kind === "song").length,
    favorites: works.filter((item) => galleryWorkIsFavorite(item, favorites)).length,
    archive: archiveWorks.length,
  }), [archiveWorks, favorites, works]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = filter === "archive" ? archiveWorks : works;
    const filtered = pool.filter((item) => {
      if (filter === "favorites") return galleryWorkIsFavorite(item, favorites);
      if (filter !== "all" && filter !== "archive" && item.kind !== filter) return false;
      if (!needle) return true;
      return item.title.toLowerCase().includes(needle) || item.prompt.toLowerCase().includes(needle) || item.model.toLowerCase().includes(needle);
    });
    return filtered.sort((left, right) => {
      const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sort === "newest" ? -delta : delta;
    });
  }, [archiveWorks, favorites, filter, query, sort, works]);

  const latestAt = works.reduce((latest, item) => {
    const next = new Date(item.createdAt).getTime();
    return next > latest ? next : latest;
  }, 0);

  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(getLocaleOption(locale).intl, { dateStyle: "short", timeStyle: "short" }),
    [locale],
  );
  const relative = useMemo(
    () => new Intl.RelativeTimeFormat(getLocaleOption(locale).intl, { numeric: "auto" }),
    [locale],
  );

  const formatCreated = (value: string) => dateTime.format(new Date(value));
  const formatUpdated = (timestamp: number) => {
    if (!timestamp) return "—";
    const minutes = Math.round((timestamp - Date.now()) / 60000);
    if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) return relative.format(hours, "hour");
    return relative.format(Math.round(hours / 24), "day");
  };

  const toggleFavorite = useCallback((work: GalleryWork) => {
    if (!user) return;
    setFavorites(toggleGalleryFavorite(user.id, galleryWorkFavoriteId(work)));
  }, [user]);

  const archiveWork = useCallback(async (work: GalleryWork) => {
    try {
      if (work.kind === "photo" || work.kind === "video") {
        if (!work.requestId) throw new Error("missing_request");
        await deleteGeneration(work.requestId);
      } else {
        const trackId = work.rateId ?? work.id;
        const response = await fetch(`/api/music/tracks/${encodeURIComponent(trackId)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("delete_failed");
        setMusicWorks((items) => items.filter((item) => item.id !== work.id));
        window.dispatchEvent(new Event("genora-gallery-change"));
      }
      setPromptWork((current) => current?.id === work.id ? null : current);
    } catch {
      setNotice(appCopy.conversationDeleteFailed);
    }
  }, [appCopy.conversationDeleteFailed, deleteGeneration]);

  const downloadWork = useCallback(async (work: GalleryWork) => {
    try {
      const response = await fetch(work.url);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.split("/")[1] || "bin";
      anchor.href = objectUrl;
      anchor.download = `genora-${work.id}.${ext}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setNotice(copy.downloadFailed);
    }
  }, [copy.downloadFailed]);

  const shareWork = useCallback(async (work: GalleryWork) => {
    try {
      const response = await fetch(work.url);
      if (!response.ok) throw new Error("share");
      const blob = await response.blob();
      const ext = blob.type.split("/")[1] || "bin";
      const file = new File([blob], `genora-${work.id}.${ext}`, { type: blob.type });
      const absoluteUrl = new URL(work.url, window.location.origin).href;
      const shareData = { url: absoluteUrl, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ url: absoluteUrl });
        return;
      }
      await navigator.clipboard.writeText(absoluteUrl);
      setNotice(copy.linkCopied);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setNotice(copy.shareFailed);
    }
  }, [copy.linkCopied, copy.shareFailed]);

  if (!ready) return <div className="mx-auto flex h-full max-w-6xl items-center px-4 text-sm text-steel">…</div>;
  if (!user) {
    return (
      <section className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 text-center">
        <LayoutGrid className="mx-auto size-8 text-accent-brand" />
        <h1 className="mt-3 text-xl font-semibold text-text">{copy.title}</h1>
        <p className="mt-2 text-sm text-steel">{t.workspace.gallerySignIn}</p>
        <Button nativeButton={false} className="mt-5" render={<Link href="/login" />}>{t.workspace.signIn}</Button>
      </section>
    );
  }

  const filters: Array<{ id: Filter; label: string; count: number; icon: React.ReactNode }> = [
    { id: "all", label: copy.filterAll, count: counts.all, icon: <LayoutGrid className="size-3.5" /> },
    { id: "photo", label: copy.filterPhoto, count: counts.photo, icon: <ImageIcon className="size-3.5" /> },
    { id: "video", label: copy.filterVideo, count: counts.video, icon: <Video className="size-3.5" /> },
    { id: "music", label: copy.filterMusic, count: counts.music, icon: <Music2 className="size-3.5" /> },
    { id: "song", label: copy.filterSongs, count: counts.song, icon: <Music2 className="size-3.5" /> },
    { id: "favorites", label: copy.filterFavorites, count: counts.favorites, icon: <Heart className="size-3.5" /> },
    { id: "archive", label: copy.filterArchive, count: counts.archive, icon: <Archive className="size-3.5" /> },
  ];

  const actions = (work: GalleryWork) => {
    const liked = galleryWorkIsFavorite(work, favorites);
    const rateId = work.rateId ?? work.id;
    const rated = feedback.voteForMessage(rateId) === 1;
    return (
      <div className="flex items-center gap-0.5">
        <DownloadSizeAction label={copy.download} url={work.url} onClick={() => void downloadWork(work)} iconClassName="size-3" buttonClassName="size-6 rounded-md" />
        <IconAction label={copy.share} onClick={() => void shareWork(work)}><Share2 className="size-3" /></IconAction>
        <IconAction
          label={copy.rate}
          active={rated}
          onClick={() => work.modelId && saveModelFeedback(rateId, work.modelId, work.model, 1)}
        >
          <ThumbsUp className={cn("size-3", rated && "fill-current")} />
        </IconAction>
        <IconAction label={liked ? copy.favoriteRemove : copy.favoriteAdd} active={liked} onClick={() => toggleFavorite(work)}>
          <Heart className={cn("size-3", liked && "fill-current")} />
        </IconAction>
        {filter !== "archive" ? <IconAction label={deleteCopy.title} onClick={() => setPendingDelete(work)}><Trash2 className="size-3" /></IconAction> : null}
      </div>
    );
  };

  const openWork = (work: GalleryWork) => {
    if (work.kind === "photo" || work.kind === "video") {
      setPreview(work);
      return;
    }
    setPlaying(work);
  };

  const captionLine = (work: GalleryWork) => {
    const caption = work.kind === "photo" || work.kind === "video" ? (work.mediaTitle || work.prompt || work.title) : work.title;
    return (
      <div className="flex min-w-0 items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-text" title={caption}>{caption}</p>
        {work.prompt ? (
          <button type="button" title={ui.viewPrompt} aria-label={ui.viewPrompt} onClick={() => setPromptWork(work)} className="grid size-6 shrink-0 place-items-center rounded-md text-steel hover:bg-mist hover:text-text">
            <Eye className="size-3" />
          </button>
        ) : null}
      </div>
    );
  };

  const mediaThumb = (work: GalleryWork, compact = false) => {
    const thumb = work.kind === "photo" || work.kind === "video"
      ? (work.previewUrl ?? `${work.url}${work.url.includes("?") ? "&" : "?"}variant=preview`)
      : work.coverUrl;
    return (
    <button
      type="button"
      onClick={() => openWork(work)}
      className={cn("relative block size-full overflow-hidden bg-mist", compact ? "rounded-lg" : "")}
      aria-label={work.kind === "photo" || work.kind === "video" ? work.title : ui.play}
    >
      {work.kind === "video" && thumb ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={work.title} loading="lazy" decoding="async" className="size-full object-cover" />
          <span className={cn("absolute inset-0 m-auto grid place-items-center rounded-full bg-black/55 text-white shadow-lg", compact ? "size-7" : "size-11")}>
            <Play className={cn("fill-current", compact ? "size-3.5" : "size-5")} />
          </span>
        </>
      ) : work.kind === "video" ? (
        <div className="grid size-full place-items-center bg-[color-mix(in_oklch,var(--accent)_7%,var(--mist))] text-steel">
          <Video className={compact ? "size-4" : "size-7"} />
          <Play className="absolute size-4 fill-current text-accent-brand" />
        </div>
      ) : thumb ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={work.title} loading="lazy" decoding="async" className="size-full object-cover" />
          {work.kind === "music" || work.kind === "song" ? <Play className="absolute inset-0 m-auto size-4 text-white drop-shadow" /> : null}
        </>
      ) : (
        <div className="grid size-full place-items-center text-steel">
          <Music2 className={compact ? "size-4" : "size-6"} />
          {work.kind === "music" || work.kind === "song" ? <Play className="absolute size-4 text-accent-brand" /> : null}
        </div>
      )}
    </button>
    );
  };

  return (
    <section className="relative mx-auto flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden px-4 pt-3 sm:px-6">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-text">{copy.title}</h1>
        <p className="mt-0.5 text-xs text-steel">{copy.subtitle}</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mt-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-steel" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAria}
              className="h-9 w-full rounded-xl border border-border bg-surface pe-3 ps-9 text-sm text-text outline-none placeholder:text-steel focus:border-accent-brand/50 focus:ring-2 focus:ring-accent-brand/10"
            />
          </label>
          <SelectMenu
            ariaLabel={copy.sortNewest}
            value={sort}
            options={[
              { value: "newest", label: copy.sortNewest },
              { value: "oldest", label: copy.sortOldest },
            ]}
            onChange={(next) => setSort(next as SortOrder)}
            className="h-9 w-full sm:w-44"
          />
          <div className="flex shrink-0 rounded-xl border border-border bg-surface p-0.5">
            <button type="button" title={copy.viewGrid} aria-label={copy.viewGrid} aria-pressed={view === "grid"} onClick={() => setView("grid")} className={cn("grid size-8 place-items-center rounded-lg", view === "grid" ? "bg-mist text-text" : "text-steel hover:text-text")}>
              <Grid2x2 className="size-3.5" />
            </button>
            <button type="button" title={copy.viewList} aria-label={copy.viewList} aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("grid size-8 place-items-center rounded-lg", view === "list" ? "bg-mist text-text" : "text-steel hover:text-text")}>
              <LayoutList className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                filter === item.id ? "border-text bg-text text-bg" : "border-border bg-surface text-text hover:bg-mist",
              )}
            >
              {item.icon}
              {item.label}
              <span className={cn("text-[10px] tabular-nums", filter === item.id ? "text-bg/70" : "text-steel")}>{item.count}</span>
            </button>
          ))}
        </div>

        <p className="mt-2 shrink-0 text-[11px] text-steel">
          {copy.itemsCount(visible.length)}
          <span className="mx-2 text-border">|</span>
          {copy.favoritesCount(counts.favorites)}
          <span className="mx-2 text-border">|</span>
          {copy.updatedAt(formatUpdated(latestAt))}
        </p>
        {notice ? <p className="mt-1 shrink-0 text-[11px] text-steel">{notice}</p> : null}

        <div data-lenis-prevent className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-16">
          {loading ? <p className="mt-6 text-sm text-steel">…</p> : null}
          {!loading && visible.length === 0 ? <p className="mt-6 text-sm text-steel">{copy.empty}</p> : null}

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(max(15%,11.5rem),1fr))]">
              {visible.map((work) => (
                <article key={work.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="relative aspect-square bg-mist">{mediaThumb(work)}</div>
                  <div className="px-2 py-1.5">
                    {captionLine(work)}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-steel">{kindLabel(work.kind, copy)}</span>
                      <span className="min-w-0 truncate text-[10px] text-steel">{work.model}{work.size ? ` · ${work.size}` : ""}</span>
                      {work.kind === "video" && work.durationSec ? (
                        <span className="ms-auto shrink-0 text-[10px] tabular-nums text-steel">{work.durationSec} {videoStudioUiCopy(locale).seconds}</span>
                      ) : work.kind === "photo" && work.format ? (
                        <span className="ms-auto shrink-0 text-[10px] uppercase tracking-wide text-steel">{work.format}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px] tabular-nums">
                      <time className="text-steel" dateTime={work.createdAt}>{formatCreated(work.createdAt)}</time>
                      {(work.kind === "photo" || work.kind === "video") && (work.billedTokens ?? 0) > 0 ? (
                        <span className="inline-flex items-center text-text">{withCreditGlyphs(formatTokensAsCredits(work.billedTokens ?? 0, locale, "spend"))}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1 border-t border-border pt-1">
                      {actions(work)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {visible.map((work) => (
                <article key={work.id} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-mist">{mediaThumb(work, true)}</div>
                  <div className="min-w-0 flex-1">
                    {captionLine(work)}
                    <p className="flex min-w-0 items-center gap-1.5 text-[10px] text-steel">
                      <span className="min-w-0 truncate">{kindLabel(work.kind, copy)} · {work.model}{work.size ? ` · ${work.size}` : ""}</span>
                      {work.kind === "photo" && work.format ? (
                        <span className="ms-auto shrink-0 uppercase tracking-wide">{work.format}</span>
                      ) : work.kind === "video" && work.durationSec ? (
                        <span className="ms-auto shrink-0 tabular-nums">{work.durationSec} {videoStudioUiCopy(locale).seconds}</span>
                      ) : null}
                      {(work.kind === "photo" || work.kind === "video") && (work.billedTokens ?? 0) > 0 ? (
                        <span className="inline-flex shrink-0 items-center tabular-nums text-text">{withCreditGlyphs(formatTokensAsCredits(work.billedTokens ?? 0, locale, "spend"))}</span>
                      ) : null}
                    </p>
                  </div>
                  {actions(work)}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {playing ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur sm:px-6">
          <button type="button" title={ui.close} aria-label={ui.close} onClick={() => setPlaying(null)} className="grid size-8 shrink-0 place-items-center rounded-lg text-steel hover:bg-mist">
            <X className="size-4" />
          </button>
          <p className="min-w-0 max-w-[10rem] truncate text-xs text-text sm:max-w-xs">{playing.title}</p>
          <MusicPlayer src={playing.url} />
        </div>
      ) : null}

      {preview ? createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={preview.title}>
          <button type="button" title={ui.closePreview} aria-label={ui.closePreview} onClick={() => setPreview(null)} className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="size-5" />
          </button>
          {preview.kind === "video" ? (
            <video src={preview.url} controls autoPlay className="max-h-[90dvh] max-w-[90vw] rounded-xl bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={preview.title} className="max-h-[90dvh] max-w-[90vw] rounded-xl object-contain" />
          )}
        </div>,
        document.body,
      ) : null}

      {promptWork ? createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={mediaTitleCopy(locale).prompt} onClick={() => setPromptWork(null)}>
          <MediaPromptDialog
            key={`${promptWork.kind}:${promptWork.rateId ?? promptWork.id}`}
            locale={locale}
            prompt={promptWork.prompt}
            title={promptWork.kind === "photo" || promptWork.kind === "video" ? (promptWork.mediaTitle ?? "") : promptWork.title}
            closeLabel={ui.close}
            onClose={() => setPromptWork(null)}
            onSave={filter === "archive" || (promptWork.kind !== "photo" && promptWork.kind !== "video") || !promptWork.rateId ? undefined : (title) => renameMedia(promptWork.kind as "photo" | "video", promptWork.rateId!, title)}
            copyButton={<PromptCopyButton text={promptWork.prompt} />}
          />
        </div>,
        document.body,
      ) : null}
      {pendingDelete ? (
        <ConfirmActionDialog
          title={deleteCopy.title}
          cancelLabel={deleteCopy.cancel}
          confirmLabel={deleteCopy.confirm}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            const work = pendingDelete;
            setPendingDelete(null);
            void archiveWork(work);
          }}
        />
      ) : null}
    </section>
  );
}
