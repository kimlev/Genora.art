"use client";
import { promptErrorMessage } from "@/lib/public-error";

import { ProviderLogo } from "@/components/chat/provider-logo";
import { waitForGenerationJob } from "@/lib/generation-job-client";
import { ConfirmActionDialog } from "@/components/layout/confirm-action-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useImageHistory } from "@/components/providers/image-history-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { SelectMenu } from "@/components/ui/select-menu";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { Link } from "@/components/ui/locale-link";
import { SONG_COVER_ACCEPT, SONG_COVER_DESC_MAX, SONG_COVER_EDGE, SONG_COVER_MAX_BYTES, SONG_COVER_MODEL, SONG_COVER_PROVIDER, SONG_COVER_WORDS_MAX, songCoverTokenPrice } from "@/lib/catalog/music-cover";
import { musicModelAdvantage } from "@/lib/catalog/music-guide";
import {
  AUTO_DURATION_SEC,
  DEFAULT_MUSIC_BPM,
  MUSIC_CUSTOM_TAG_MAX,
  MUSIC_DESCRIPTION_LIMIT,
  MUSIC_DURATION_STEPS,
  MUSIC_VIDEO_ACCEPT,
  MUSIC_VIDEO_MAX_BYTES,
  MUSIC_VIDEO_MAX_SEC,
  MUSIC_VIDEO_MIN_SEC,
  localizedMusicTagName,
  MUSIC_GENRES,
  MUSIC_LYRICS_HELP_MIN,
  MUSIC_MOODS,
  MUSIC_PURPOSES,
  MUSIC_STYLES,
  MUSIC_TAG_LIMITS,
  MUSIC_TITLE_MAX,
  SONG_STRUCTURE,
  clampMusicVideoDuration,
  displayMusicTitle,
  durationLabel,
  formatTrackTime,
  isAllowedMusicVideoFile,
  looksLikeMusicVideoBytes,
  lyricsCharLimit,
  musicDbId,
  musicModeAllowsAutoDuration,
  musicModelSupportsMode,
  musicTokenPriceForDuration,
  musicVideoDurationFits,
  musicVideoFileLabel,
  tempoName,
  type MusicMode,
  type MusicTag,
  type MusicTagKind,
  type MusicVocal,
} from "@/lib/catalog/music-studio";
import { formatTokensAsCredits } from "@/lib/credits";
import { localeOptions } from "@/lib/i18n";
import { musicStudioCopy } from "@/lib/i18n/copy/music-page";
import { musicStudioUiCopy, musicVideoUiCopy } from "@/lib/i18n/copy/music-studio-ui-copy";
import { untitledTrackLabel } from "@/lib/i18n/copy/untitled-track-copy";
import { deleteConfirmationCopy } from "@/lib/i18n/copy/delete-confirmation";
import { readGalleryFavorites, subscribeGalleryFavorites, toggleGalleryFavorite } from "@/lib/gallery-favorites";
import { saveModelFeedback, useModelFeedback } from "@/lib/model-feedback";
import { hydrateCreatingMusicJobs, listPendingMusicJobs, reconcilePendingMusicJobs, removePendingMusicJob, startMusicJob, subscribeMusicJobs, type MusicTrackRecord } from "@/lib/music-pending-jobs";
import { cn } from "@/lib/utils";
import { MIN_VOICE_BYTES, VOICE_RECORDER_TIMESLICE_MS, cleanAudioMime, fileDataUrl, flushAndStopRecorder, recorderMime, voiceFilename } from "@/lib/voice-recorder";
import { MusicPlayer, TrackDurationSync } from "@/components/music/music-player";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Download, Heart, ListPlus, LoaderCircle, Mic, Music2, Pencil, Play, Plus, Share2, Sparkles, ThumbsUp, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MusicModel = {
  id: string;
  label: string;
  provider: string;
  provider_label: string;
  description: string;
  modes: MusicMode[];
  durations: number[];
  default_duration: number;
  vocal_options: MusicVocal[];
  duration_control: boolean;
  languages: string[];
  token_prices: Record<string, number>;
  token_price_auto: number | null;
  available?: boolean;
  video_input?: boolean;
  billing_unit?: string | null;
  price_per_second_usd?: number | null;
  price_per_minute_usd?: number | null;
  price_per_track_usd?: number | null;
  price_per_second_cny?: number | null;
  multiplier?: number | null;
};

type ClipVideo = { name: string; dataUrl: string; durationSec: number };

function readVideoFileDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (error) reject(new Error(error));
    };
    const accept = () => {
      const seconds = video.duration;
      if (Number.isFinite(seconds) && seconds > 0 && seconds !== Infinity) {
        finish();
        resolve(seconds);
        return;
      }
      finish("duration");
    };
    const timer = window.setTimeout(() => finish("duration"), 8_000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = accept;
    video.onerror = () => finish("type");
    video.src = url;
  });
}

type MusicTrack = MusicTrackRecord;

type Catalog = {
  available: boolean;
  models: MusicModel[];
  languages: Array<{ id: string; label: string }>;
};

function Segment({ value, left, right, onChange }: { value: "preset" | "custom"; left: string; right: string; onChange: (value: "preset" | "custom") => void }) {
  return (
    <div className="inline-flex rounded-full bg-mist p-0.5 text-xs font-medium">
      <button type="button" onClick={() => onChange("preset")} className={cn("rounded-full px-3 py-1", value === "preset" ? "bg-surface text-text shadow-sm" : "text-steel")}>{left}</button>
      <button type="button" onClick={() => onChange("custom")} className={cn("rounded-full px-3 py-1", value === "custom" ? "bg-surface text-text shadow-sm" : "text-steel")}>{right}</button>
    </div>
  );
}

function cropCoverFile(file: File): Promise<string> {
  if (!SONG_COVER_ACCEPT.split(",").includes(file.type)) return Promise.reject(new Error("type"));
  if (file.size > SONG_COVER_MAX_BYTES) return Promise.reject(new Error("size"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("type"));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("type"));
      image.onload = () => {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        if (side < 64) {
          reject(new Error("type"));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = SONG_COVER_EDGE;
        canvas.height = SONG_COVER_EDGE;
        const sx = (image.naturalWidth - side) / 2;
        const sy = (image.naturalHeight - side) / 2;
        canvas.getContext("2d")?.drawImage(image, sx, sy, side, side, 0, 0, SONG_COVER_EDGE, SONG_COVER_EDGE);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function appendCoverText(current: string, extra: string, joiner = " ") {
  const next = current.trim() ? `${current.trim()}${joiner}${extra}` : extra;
  return next.slice(0, SONG_COVER_DESC_MAX);
}

function formatRecordClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function VoiceBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="w-0.5 origin-bottom rounded-full bg-rose-600"
          style={{
            height: `${10 + (index % 2) * 6}px`,
            animation: "cover-voice 0.65s ease-in-out infinite",
            animationDelay: `${index * 110}ms`,
          }}
        />
      ))}
    </span>
  );
}


function apiErrorText(payload: { message?: string; error?: string } | null, fallback: string) {
  const raw = payload?.message || payload?.error;
  if (!raw || raw === "validation_error" || raw === "music_generation_failed" || raw === "music_lyrics_failed") return fallback;
  return raw;
}

function TagBlock({
  title,
  moreHref,
  tags,
  kind,
  selected,
  custom,
  customText,
  onToggle,
  onCustom,
}: {
  title: string;
  moreHref: string;
  tags: MusicTag[];
  kind: MusicTagKind;
  selected: string[];
  custom: boolean;
  customText: string;
  onToggle: (id: string) => void;
  onCustom: (next: boolean, text?: string) => void;
}) {
  const { locale } = useLocale();
  const copy = musicStudioCopy(locale);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={cn("flex items-center justify-between gap-3", open && "mb-2")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={title}
            className="grid size-6 shrink-0 place-items-center rounded-md text-steel hover:bg-mist hover:text-text"
          >
            <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
          </button>
          <p className="text-sm font-semibold text-text">
            {title}{" "}
            <Link href={moreHref} className="text-[9px] font-normal text-accent-brand underline-offset-2 hover:underline">
              ({copy.more})
            </Link>
          </p>
        </div>
        <Segment
          value={custom ? "custom" : "preset"}
          left={copy.preset}
          right={copy.custom}
          onChange={(next) => {
            onCustom(next === "custom");
            if (next === "custom") setOpen(true);
          }}
        />
      </div>
      {open ? (
        custom ? (
          <div className="relative">
            <input
              value={customText}
              maxLength={MUSIC_CUSTOM_TAG_MAX}
              onChange={(event) => onCustom(true, event.target.value)}
              placeholder={copy.customPlaceholder}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 pe-16 text-sm text-text outline-none placeholder:text-steel focus:border-accent-brand"
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-steel">
              {customText.length} {copy.charsOf} {MUSIC_CUSTOM_TAG_MAX}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-mist/50 p-2.5">
            {tags.map((tag) => {
              const active = selected.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggle(tag.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "bg-accent-brand text-white" : "bg-surface text-text hover:bg-mist",
                  )}
                >
                  {localizedMusicTagName(tag, locale)}
                </button>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}

export function MusicStudio() {
  const { user, ready, setBalanceTokens } = useAuth();
  const { addGeneration } = useImageHistory();
  const { locale } = useLocale();
  const copy = musicStudioCopy(locale);
  const feedback = useModelFeedback();
  const ui = musicStudioUiCopy(locale);
  const videoCopy = musicVideoUiCopy(locale);
  const deleteCopy = deleteConfirmationCopy(locale);
  const [catalog, setCatalog] = useState<Catalog>({ available: false, models: [], languages: [] });
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [pending, setPending] = useState<MusicTrack[]>(() => listPendingMusicJobs());
  const [mode, setMode] = useState<MusicMode>("song");
  const [autoDuration, setAutoDuration] = useState(false);
  const [duration, setDuration] = useState(120);
  const [bpm, setBpm] = useState(DEFAULT_MUSIC_BPM);
  const [vocal, setVocal] = useState<MusicVocal>("auto");
  const [songPrompt, setSongPrompt] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const promptResizedRef = useRef(false);
  const [modelKey, setModelKey] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState(false);
  const [customStyle, setCustomStyle] = useState(false);
  const [customMood, setCustomMood] = useState(false);
  const [customPurpose, setCustomPurpose] = useState(false);
  const [customGenreText, setCustomGenreText] = useState("");
  const [customStyleText, setCustomStyleText] = useState("");
  const [customMoodText, setCustomMoodText] = useState("");
  const [customPurposeText, setCustomPurposeText] = useState("");
  const [language, setLanguage] = useState("auto");
  const [title, setTitle] = useState("");
  const [structureOpen, setStructureOpen] = useState(false);
  const [helping, setHelping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [coverTrack, setCoverTrack] = useState<MusicTrack | null>(null);
  const [coverWords, setCoverWords] = useState("");
  const [coverText, setCoverText] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverNotice, setCoverNotice] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverRecording, setCoverRecording] = useState(false);
  const [coverRecordSec, setCoverRecordSec] = useState(0);
  const [coverTranscribing, setCoverTranscribing] = useState(false);
  const [coverPrice, setCoverPrice] = useState(0);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [clipVideo, setClipVideo] = useState<ClipVideo | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const coverRecorderRef = useRef<MediaRecorder | null>(null);
  const coverChunksRef = useRef<Blob[]>([]);
  const coverStartedAtRef = useRef(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MusicTrack | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/music/catalog").then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!payload) return;
      setCatalog({ available: Boolean(payload.available), models: payload.models ?? [], languages: payload.languages ?? [] });
    }).catch(() => undefined);
  }, []);

  const loadTracks = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/music/generations", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { tracks?: MusicTrack[] };
    const next = payload.tracks ?? [];
    setTracks(next);
    reconcilePendingMusicJobs(next);
  }, [user]);

  useEffect(() => { void loadTracks(); }, [loadTracks]);
  useEffect(() => {
    let active = true;
    void fetch("/api/images/catalog", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { models?: Array<{ provider: string; id: string; token_prices?: Record<string, number> }> } | null) => {
        if (!active) return;
        const model = payload?.models?.find((item) => item.provider === SONG_COVER_PROVIDER && item.id === SONG_COVER_MODEL);
        const tokens = songCoverTokenPrice(model?.token_prices);
        if (tokens > 0) setCoverPrice(tokens);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!coverRecording) {
      setCoverRecordSec(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setCoverRecordSec(Math.floor((Date.now() - started) / 1000)), 200);
    return () => window.clearInterval(timer);
  }, [coverRecording]);
  useEffect(() => subscribeMusicJobs(() => setPending(listPendingMusicJobs())), []);
  useEffect(() => { hydrateCreatingMusicJobs(); }, []);
  useEffect(() => {
    if (!pending.some((item) => item.status === "creating")) return;
    const timer = window.setInterval(() => { void loadTracks(); }, 4000);
    return () => window.clearInterval(timer);
  }, [loadTracks, pending]);
  useEffect(() => {
    const onReady = (event: Event) => {
      const track = (event as CustomEvent<MusicTrack>).detail;
      if (!track?.id) return;
      setTracks((items) => [track, ...items.filter((item) => item.id !== track.id)]);
    };
    window.addEventListener("genora-music-ready", onReady);
    return () => window.removeEventListener("genora-music-ready", onReady);
  }, []);
  useEffect(() => {
    if (!user) return;
    const refresh = () => setFavorites(readGalleryFavorites(user.id));
    refresh();
    return subscribeGalleryFavorites(refresh);
  }, [user]);

  const prompt = mode === "song" ? songPrompt : musicPrompt;
  const setPrompt = mode === "song" ? setSongPrompt : setMusicPrompt;
  const limit = mode === "instrumental"
    ? MUSIC_DESCRIPTION_LIMIT
    : lyricsCharLimit(autoDuration ? AUTO_DURATION_SEC : duration, bpm);
  const startPromptResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.detail >= 2) return;
    event.preventDefault();
    const startY = event.clientY;
    const startH = composerRef.current?.offsetHeight ?? 160;
    const move = (moveEvent: PointerEvent) => {
      const next = Math.min(Math.max(startH + (moveEvent.clientY - startY), 160), window.innerHeight * 0.7);
      const target = composerRef.current;
      if (!target) return;
      target.style.height = `${next}px`;
      target.style.maxHeight = "none";
      target.style.overflowY = "auto";
      promptResizedRef.current = true;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const tagValue = (custom: boolean, customText: string, selected: string[]) => custom ? customText.trim() : selected.join(",");
  const toggleTag = (kind: MusicTagKind, id: string) => {
    const limit = MUSIC_TAG_LIMITS[kind];
    const setter = kind === "genre" ? setGenres : kind === "style" ? setStyles : kind === "mood" ? setMoods : setPurposes;
    setter((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= limit) return current;
      return [...current, id];
    });
  };
  const models = useMemo(() => catalog.models.filter((model) => {
    if (model.available === false) return false;
    if (!musicModelSupportsMode(model, mode)) return false;
    if (model.video_input) {
      return musicVideoDurationFits(model, clipVideo?.durationSec ?? duration);
    }
    if (autoDuration) return model.duration_control === false;
    if (model.duration_control === false) return false;
    return (model.durations?.length ? model.durations : [...MUSIC_DURATION_STEPS]).includes(duration);
  }), [autoDuration, catalog.models, clipVideo, duration, mode]);
  const availableVocals = useMemo(() => {
    const all: MusicVocal[] = ["auto", "male", "female", "duet"];
    if (mode === "instrumental") return [];
    return all.filter((option) => models.some((model) => (model.vocal_options ?? ["auto"]).includes(option)));
  }, [mode, models]);
  const visibleModels = useMemo(
    () => mode === "instrumental" ? models : models.filter((model) => (model.vocal_options ?? ["auto"]).includes(vocal)),
    [mode, models, vocal],
  );
  const selected = visibleModels.find((model) => `${model.provider}:${model.id}` === modelKey) ?? visibleModels[0] ?? null;
  const usedDuration = clipVideo?.durationSec ?? duration;
  const price = selected
    ? musicTokenPriceForDuration(selected, usedDuration, clipVideo ? false : autoDuration)
    : 0;
  const languageOptions = useMemo(() => {
    const allowed = new Set(selected?.languages?.length ? selected.languages : ["auto"]);
    const extras = (catalog.languages ?? []).filter((item) => allowed.has(item.id));
    const fromLocale = localeOptions.filter((item) => allowed.has(item.code)).map((item) => ({ id: item.code, label: `${item.flag} ${item.label}` }));
    const merged = extras.length
      ? extras.map((item) => {
        const locale = localeOptions.find((option) => option.code === item.id);
        return { id: item.id, label: locale ? `${locale.flag} ${item.label}` : item.label };
      })
      : fromLocale;
    return [{ id: "auto", label: copy.languageAuto }, ...merged.filter((item) => item.id !== "auto")];
  }, [catalog.languages, selected]);

  useEffect(() => {
    if (selected) setModelKey(`${selected.provider}:${selected.id}`);
  }, [selected]);
  useEffect(() => {
    if (mode === "instrumental" || availableVocals.includes(vocal)) return;
    setVocal(availableVocals[0] ?? "auto");
  }, [availableVocals, mode, vocal]);
  useEffect(() => {
    if (selected?.video_input) return;
    setClipVideo(null);
    setFileError(null);
  }, [selected?.video_input]);
  useEffect(() => {
    if (language === "auto" || !selected) return;
    if (selected.languages.includes(language)) return;
    setLanguage("auto");
  }, [language, selected]);

  const switchMode = (next: MusicMode) => {
    if (next === mode) return;
    const current = catalog.models.find((model) => `${model.provider}:${model.id}` === modelKey);
    setMode(next);
    setStructureOpen(false);
    setVocal("auto");
    setClipVideo(null);
    setFileError(null);
    if (!musicModelSupportsMode(current ?? {}, next)) setModelKey("");
    if (autoDuration && !musicModeAllowsAutoDuration(catalog.models, next)) setAutoDuration(false);
  };

  const attachVideo = async (file: File) => {
    setFileError(null);
    setError(null);
    if (!isAllowedMusicVideoFile(file)) {
      setClipVideo(null);
      setFileError(videoCopy.fileType);
      return;
    }
    if (file.size > MUSIC_VIDEO_MAX_BYTES) {
      setClipVideo(null);
      setFileError(videoCopy.fileSize);
      return;
    }
    try {
      const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!looksLikeMusicVideoBytes(header)) {
        setClipVideo(null);
        setFileError(videoCopy.notVideo);
        return;
      }
      const seconds = await readVideoFileDuration(file);
      if (seconds < MUSIC_VIDEO_MIN_SEC) {
        setClipVideo(null);
        setFileError(videoCopy.tooShort);
        return;
      }
      if (seconds > MUSIC_VIDEO_MAX_SEC) {
        setClipVideo(null);
        setFileError(videoCopy.tooLong);
        return;
      }
      const durationSec = clampMusicVideoDuration(seconds);
      const dataUrl = await fileDataUrl(file);
      setClipVideo({ name: file.name, dataUrl, durationSec });
      setAutoDuration(false);
      setFileError(null);
    } catch {
      setClipVideo(null);
      setFileError(videoCopy.durationFail);
    }
  };

  const insertStructure = (id: string) => {
    setPrompt((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}[${id}]\n`);
    setStructureOpen(false);
  };

  const helpPrompt = async () => {
    if (prompt.trim().length < MUSIC_LYRICS_HELP_MIN) return;
    setHelping(true);
    setError(null);
    try {
      const response = await fetch("/api/music/lyrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          ...(mode === "instrumental" && autoDuration ? {} : { duration: autoDuration ? AUTO_DURATION_SEC : duration }),
          bpm,
          language,
          genre: tagValue(customGenre, customGenreText, genres) || undefined,
          style: tagValue(customStyle, customStyleText, styles) || undefined,
          mood: tagValue(customMood, customMoodText, moods) || undefined,
          purpose: tagValue(customPurpose, customPurposeText, purposes) || undefined,
        }),
      });
      const payload = await response.json() as { lyrics?: string; message?: string };
      if (!response.ok || !payload.lyrics) throw new Error(apiErrorText(payload, copy.catalogUnavailable));
      setPrompt(payload.lyrics.slice(0, limit));
    } catch (item) {
      setError(item instanceof Error ? item.message : copy.catalogUnavailable);
    } finally {
      setHelping(false);
    }
  };

  const generate = () => {
    if (!user || !selected) return;
    if (selected.video_input && !clipVideo) {
      setFileError(videoCopy.needVideo);
      return;
    }
    if (!selected.video_input && !prompt.trim()) return;
    setError(null);
    const genre = tagValue(customGenre, customGenreText, genres) || null;
    const style = tagValue(customStyle, customStyleText, styles) || null;
    const mood = tagValue(customMood, customMoodText, moods) || null;
    const purpose = tagValue(customPurpose, customPurposeText, purposes) || null;
    startMusicJob({
      title: title.trim() || untitledTrackLabel(locale),
      mode,
      modelLabel: selected.label,
      genre,
      style,
      mood,
      purpose,
      lyrics: mode === "song" ? prompt : null,
      prompt: prompt.trim() || (clipVideo ? "Score this video to picture." : prompt),
      body: {
        provider: selected.provider,
        model: selected.id,
        mode,
        prompt: prompt.trim() || (clipVideo ? "Score this video to picture." : prompt),
        lyrics: mode === "song" ? prompt : undefined,
        title,
        genre: genre || undefined,
        style: style || undefined,
        mood: mood || undefined,
        purpose: purpose || undefined,
        bpm,
        duration: usedDuration,
        autoDuration: clipVideo ? false : autoDuration,
        vocal,
        language,
        inputVideo: clipVideo?.dataUrl,
      },
    });
    setClipVideo(null);
    setSongPrompt("");
    setMusicPrompt("");
    setTitle("");
    setGenres([]);
    setStyles([]);
    setMoods([]);
    setPurposes([]);
    setCustomGenre(false);
    setCustomStyle(false);
    setCustomMood(false);
    setCustomPurpose(false);
    setCustomGenreText("");
    setCustomStyleText("");
    setCustomMoodText("");
    setCustomPurposeText("");
  };

  const generateCover = async () => {
    if (!coverTrack || coverBusy) return;
    if (coverTrack.id.startsWith("pending-") || coverTrack.status === "creating") {
      setCoverNotice(ui.coverFailed);
      return;
    }
    setCoverBusy(true);
    setCoverNotice(null);
    try {
      const response = await fetch(`/api/music/tracks/${coverTrack.id}/cover`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words: coverWords.trim(), description: coverText.trim(), locale }),
      });
      const data = await response.json() as {
        job?: { id: string };
        coverUrl?: string;
        balanceTokens?: number;
        error?: string;
        message?: string;
        generation?: Parameters<typeof addGeneration>[0];
        conversation?: Parameters<typeof addGeneration>[1];
      };
      if (typeof data.balanceTokens === "number") setBalanceTokens(data.balanceTokens);
      if (response.ok && data.job?.id) {
        const ready = await waitForGenerationJob(data.job.id);
        Object.assign(data, ready.result);
      }
      if (!response.ok || !data.coverUrl) throw new Error(data.message || data.error || ui.coverFailed);
      if (data.generation && data.conversation) addGeneration(data.generation, data.conversation);
      setTracks((items) => items.map((item) => item.id === coverTrack.id ? { ...item, coverUrl: data.coverUrl } : item));
      setCoverTrack((current) => current ? { ...current, coverUrl: data.coverUrl } : current);
      setCoverPreview(data.coverUrl ?? null);
    } catch (item) {
      setCoverNotice(item instanceof Error ? item.message : ui.coverFailed);
    } finally {
      setCoverBusy(false);
    }
  };

  const closeCover = () => {
    if (coverBusy) return;
    if (coverRecorderRef.current?.state === "recording") coverRecorderRef.current.stop();
    setCoverTrack(null);
    setCoverPreview(null);
    setCoverNotice(null);
    setCoverRecording(false);
    setCoverRecordSec(0);
    setCoverTranscribing(false);
  };

  const openCover = (track: MusicTrack) => {
    setCoverTrack(track);
    setCoverWords("");
    setCoverText("");
    setCoverPreview(track.coverUrl ?? null);
    setCoverNotice(null);
  };

  const pickCoverFile = async (file: File | undefined) => {
    if (!file || !coverTrack) return;
    try {
      const dataUrl = await cropCoverFile(file);
      setCoverPreview(dataUrl);
      setCoverNotice(null);
      const response = await fetch(`/api/music/tracks/${coverTrack.id}/cover`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await response.json() as { coverUrl?: string; message?: string };
      if (!response.ok || !data.coverUrl) throw new Error(data.message || ui.coverFailed);
      setCoverPreview(data.coverUrl);
      setTracks((items) => items.map((item) => item.id === coverTrack.id ? { ...item, coverUrl: data.coverUrl } : item));
      setCoverTrack((current) => current ? { ...current, coverUrl: data.coverUrl } : current);
    } catch (error) {
      const reason = (error as Error).message;
      setCoverNotice(reason === "size" ? ui.coverFileSize : reason === "type" ? ui.coverFileType : reason || ui.coverFailed);
    }
  };

  const addCoverLyrics = () => {
    const lyrics = (coverTrack?.lyrics || coverTrack?.prompt || "").trim();
    if (!lyrics) return;
    setCoverText((current) => appendCoverText(current, lyrics, "\n\n"));
  };

  const toggleCoverMic = async () => {
    if (coverBusy || coverTranscribing) return;
    const recorder = coverRecorderRef.current;
    if (coverRecording) {
      flushAndStopRecorder(recorder);
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCoverNotice(ui.coverMicFailed);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = recorderMime();
      const next = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      coverChunksRef.current = [];
      coverStartedAtRef.current = Date.now();
      next.ondataavailable = (event) => { if (event.data.size) coverChunksRef.current.push(event.data); };
      next.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setCoverRecording(false);
        setCoverNotice(ui.coverMicFailed);
      };
      next.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setCoverRecording(false);
        const elapsed = (Date.now() - coverStartedAtRef.current) / 1000;
        const type = cleanAudioMime(next.mimeType || mime || "audio/webm");
        const blob = new Blob(coverChunksRef.current, { type });
        if (elapsed < 1 || blob.size < MIN_VOICE_BYTES || coverChunksRef.current.length === 0) {
          setCoverNotice(ui.coverMicEmpty);
          return;
        }
        setCoverTranscribing(true);
        try {
          const dataUrl = await fileDataUrl(blob);
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audioBase64: dataUrl, mime: type, filename: voiceFilename(type) }),
          });
          const payload = await response.json() as { text?: string };
          const spoken = payload.text?.trim() ?? "";
          if (!response.ok) throw new Error("transcribe");
          if (!spoken) {
            setCoverNotice(ui.coverMicEmpty);
            return;
          }
          setCoverText((current) => appendCoverText(current, spoken));
          setCoverNotice(null);
        } catch {
          setCoverNotice(ui.coverTranscribeFailed);
        } finally {
          setCoverTranscribing(false);
        }
      };
      coverRecorderRef.current = next;
      setCoverNotice(null);
      setCoverRecording(true);
      next.start(VOICE_RECORDER_TIMESLICE_MS);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCoverNotice(name === "NotAllowedError" || name === "PermissionDeniedError" ? ui.coverMicDenied : ui.coverMicFailed);
    }
  };

  const toggleFavorite = (id: string) => {
    if (!user) return;
    setFavorites(toggleGalleryFavorite(user.id, id));
  };

  const persistDuration = useCallback((id: string, seconds: number) => {
    setTracks((items) => items.map((item) => item.id === id ? { ...item, durationSec: seconds } : item));
    if (id.startsWith("pending-")) return;
    void fetch(`/api/music/tracks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ durationSec: seconds }),
    });
  }, []);

  const renameTrack = async (track: MusicTrack, nextTitle: string) => {
    const title = nextTitle.trim().slice(0, MUSIC_TITLE_MAX);
    if (!title) return;
    const response = await fetch(`/api/music/tracks/${track.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
    if (!response.ok) return;
    setTracks((items) => items.map((item) => item.id === track.id ? { ...item, title } : item));
    setEditingId(null);
  };

  const libraryTracks = useMemo(() => {
    const readyIds = new Set(tracks.map((item) => item.id));
    return [...pending.filter((item) => !readyIds.has(item.id)), ...tracks];
  }, [pending, tracks]);
  const visibleTracks = libraryTracks.filter((track) => {
    if (favoritesOnly && !favorites.includes(track.id)) return false;
    if (typeFilter !== "all" && track.mode !== typeFilter) return false;
    if (genreFilter !== "all" && track.genre !== genreFilter) return false;
    if (styleFilter !== "all" && track.style !== styleFilter) return false;
    if (purposeFilter !== "all" && track.purpose !== purposeFilter) return false;
    return true;
  });

  return (
    <main className="flex h-[calc(100dvh-60px)] min-h-0 flex-col overflow-hidden bg-bg lg:flex-row">
      <section data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto border-b border-border px-4 py-4 lg:max-w-[460px] lg:border-b-0 lg:border-e lg:px-5">
        <div className="grid grid-cols-2 gap-2">
          {(["song", "instrumental"] as const).map((item) => (
            <button key={item} type="button" onClick={() => switchMode(item)} className={cn("h-11 rounded-xl border text-sm font-semibold", mode === item ? "border-accent-brand bg-accent-brand/10 text-text" : "border-border bg-surface text-steel")}>
              {item === "song" ? copy.typeSong : copy.typeMusic}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text">{copy.duration}</p>
            <button type="button" disabled={Boolean(clipVideo)} onClick={() => setAutoDuration((current) => !current)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-40", autoDuration && !clipVideo ? "border-accent-brand bg-accent-brand text-white" : "border-border text-steel")}>{copy.auto}</button>
          </div>
          <input type="range" min={0} max={MUSIC_DURATION_STEPS.length - 1} value={Math.max(0, MUSIC_DURATION_STEPS.indexOf(duration as typeof MUSIC_DURATION_STEPS[number]))} disabled={autoDuration || Boolean(clipVideo)} onChange={(event) => setDuration(MUSIC_DURATION_STEPS[Number(event.target.value)] ?? 120)} className={cn("mt-3 w-full accent-[var(--accent)]", (autoDuration || clipVideo) && "opacity-40")} />
          <p className="mt-1 text-xs text-steel">{clipVideo ? `${durationLabel(clipVideo.durationSec, locale)} · ${videoCopy.fromClip}` : autoDuration ? copy.autoDurationHint : durationLabel(duration, locale)}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-text">{copy.tempo}</p>
          <input type="range" min={66} max={200} step={1} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
          <p className="mt-1 text-xs text-steel">{bpm} BPM · {tempoName(bpm, locale)}</p>
        </div>

        {mode === "song" && availableVocals.length ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-text">{copy.voice}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["auto", "male", "female", "duet"] as const).filter((item) => availableVocals.includes(item)).map((item) => (
                <button key={item} type="button" onClick={() => setVocal(item)} className={cn("h-10 rounded-xl border text-xs font-semibold", vocal === item ? "border-accent-brand bg-accent-brand/10 text-text" : "border-border bg-surface text-steel")}>
                  {item === "auto" ? copy.voiceAuto : item === "male" ? copy.voiceMale : item === "female" ? copy.voiceFemale : copy.voiceDuet}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-text">{mode === "song" ? copy.text : copy.description}</p>
            <Button type="button" size="sm" disabled={helping || prompt.trim().length < MUSIC_LYRICS_HELP_MIN} onClick={() => void helpPrompt()}>
              <Sparkles className="size-3.5" /> {helping ? (mode === "song" ? copy.helping : copy.helpingDescription) : copy.aiHelp}
            </Button>
          </div>
          <div className="relative rounded-2xl border border-border bg-surface">
            <textarea
              ref={composerRef}
              value={prompt}
              maxLength={limit}
              onChange={(event) => setPrompt(event.target.value.slice(0, limit))}
              placeholder={selected?.video_input ? "Настроение можно не писать — модель смотрит ролик" : mode === "song" ? copy.promptPlaceholder : copy.musicPlaceholder}
              className={cn("min-h-40 w-full resize-none bg-transparent px-3 pt-3 text-sm text-text outline-none placeholder:text-steel", fileError ? "pb-24" : "pb-20")}
            />
            {fileError ? <p className="pointer-events-none absolute inset-x-3 bottom-12 text-[11px] leading-snug text-rose-600">{fileError}</p> : null}
            <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
              <div className="relative flex min-w-0 items-center gap-1.5">
                {mode === "song" ? (
                <button type="button" onClick={() => setStructureOpen((current) => !current)} className="grid size-9 place-items-center rounded-lg border border-border bg-mist text-text" aria-label={copy.structureTitle}>
                  <ListPlus className="size-4" />
                </button>
                ) : null}
                {selected?.video_input ? (
                  <>
                    <input ref={videoFileRef} type="file" accept={MUSIC_VIDEO_ACCEPT} hidden onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void attachVideo(file);
                    }} />
                    <button type="button" onClick={() => videoFileRef.current?.click()} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-mist text-text" aria-label={videoCopy.attach} title={videoCopy.attach}>
                      <Plus className="size-4" />
                    </button>
                    {clipVideo ? (
                      <span className="min-w-0 truncate text-[10px] leading-tight text-steel" title={clipVideo.name}>
                        {videoCopy.fileReady}: {musicVideoFileLabel(clipVideo.name)}
                      </span>
                    ) : null}
                  </>
                ) : null}
                {mode === "song" && structureOpen ? (
                  <div className="absolute bottom-11 start-0 z-20 w-52 rounded-xl border border-border bg-surface p-1 shadow-xl">
                    {SONG_STRUCTURE.map((item) => (
                      <button key={item.id} type="button" onClick={() => insertStructure(item.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-mist">
                        <span>[{item.id}]</span><span className="text-xs text-steel">{localizedMusicTagName(item, locale)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <button type="button" aria-label="Растянуть поле. Двойной клик — открыть целиком" title="Растянуть поле. Двойной клик — открыть целиком" onPointerDown={startPromptResize} onDoubleClick={() => setEditorOpen(true)} className="grid size-8 cursor-ns-resize place-items-center rounded-lg text-steel hover:bg-mist hover:text-text">
                  <ChevronsUpDown className="size-4" />
                </button>
                <span className="text-xs text-steel">{prompt.length} {copy.charsOf} {limit}</span>
              </div>
            </div>
          </div>
          {clipVideo ? (
            <button type="button" onClick={() => { setClipVideo(null); setFileError(null); }} className="mt-1 text-[11px] text-steel hover:text-text" aria-label={videoCopy.remove}>
              {videoCopy.remove}
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-text">{copy.model}</p>
          {visibleModels.length ? (
            <Menu
              ariaLabel={copy.model}
              triggerClassName="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              panelClassName="w-[min(440px,calc(100vw-2rem))]"
              trigger={<>
                {selected ? <ProviderLogo provider={selected.provider_label || selected.provider} className="size-7" /> : null}
                <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? copy.pickModel}</span>
                <ChevronDown className="size-4 text-steel" />
              </>}
            >
              {(close) => visibleModels.map((model) => (
                <MenuItem key={`${model.provider}:${model.id}`} className="items-start" active={`${model.provider}:${model.id}` === `${selected?.provider}:${selected?.id}`} onClick={() => { setModelKey(`${model.provider}:${model.id}`); close(); }}>
                  <ProviderLogo provider={model.provider_label || model.provider} className="mt-0.5 size-7 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{model.label}</span>
                    <span className="mt-0.5 block whitespace-pre-line text-xs leading-snug text-steel">{musicModelAdvantage(model.id, locale, model.description)}</span>
                  </span>
                  {`${model.provider}:${model.id}` === `${selected?.provider}:${selected?.id}` ? <Check className="size-4 text-accent-brand" /> : null}
                </MenuItem>
              ))}
            </Menu>
          ) : <p className="text-sm text-steel">{copy.noModels}</p>}
        </div>

        <div className="mt-6 space-y-5">
          <TagBlock title={copy.genre} moreHref="/songs#music-genres" tags={MUSIC_GENRES} kind="genre" selected={genres} custom={customGenre} customText={customGenreText} onToggle={(id) => toggleTag("genre", id)} onCustom={(next, text) => { setCustomGenre(next); if (text !== undefined) setCustomGenreText(text); }} />
          <TagBlock title={copy.style} moreHref="/songs#music-styles" tags={MUSIC_STYLES} kind="style" selected={styles} custom={customStyle} customText={customStyleText} onToggle={(id) => toggleTag("style", id)} onCustom={(next, text) => { setCustomStyle(next); if (text !== undefined) setCustomStyleText(text); }} />
          <TagBlock title={copy.mood} moreHref="/songs#music-moods" tags={MUSIC_MOODS} kind="mood" selected={moods} custom={customMood} customText={customMoodText} onToggle={(id) => toggleTag("mood", id)} onCustom={(next, text) => { setCustomMood(next); if (text !== undefined) setCustomMoodText(text); }} />
          <TagBlock title={copy.purpose} moreHref="/songs#music-purposes" tags={MUSIC_PURPOSES} kind="purpose" selected={purposes} custom={customPurpose} customText={customPurposeText} onToggle={(id) => toggleTag("purpose", id)} onCustom={(next, text) => { setCustomPurpose(next); if (text !== undefined) setCustomPurposeText(text); }} />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-text">{copy.language}</p>
          <SelectMenu ariaLabel={copy.language} value={language} options={languageOptions.map((item) => ({ value: item.id, label: item.label }))} onChange={setLanguage} />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-text">{copy.title}</p>
          <input value={title} maxLength={MUSIC_TITLE_MAX} onChange={(event) => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent-brand" />
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600" role="alert">{promptErrorMessage(error, locale)}</p> : null}
        {ready && !user ? (
          <Button nativeButton={false} className="mt-6 h-12 w-full" render={<Link href="/login" />}>{copy.loginToGenerate}</Button>
        ) : (
          <Button type="button" disabled={!selected || (selected.video_input ? !clipVideo : !prompt.trim())} onClick={generate} className="mt-6 h-12 w-full">
            {withCreditGlyphs(`${copy.generate} ${formatTokensAsCredits(price, "ru-RU", "price")}`)}
          </Button>
        )}
        {user && price > (user.balanceTokens ?? 0) ? <p className="mt-2 text-xs text-steel">На балансе может не хватить токенов для этой модели.</p> : null}
      </section>

      <section data-lenis-prevent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#f3f6f8] px-4 py-4 lg:px-6 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-text">{copy.libraryTitle}</h2>
          <button
            type="button"
            aria-pressed={favoritesOnly}
            aria-label={copy.filterFavorites}
            title={copy.filterFavorites}
            onClick={() => setFavoritesOnly((current) => !current)}
            className={cn("grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-mist", favoritesOnly ? "text-rose-500" : "text-steel")}
          >
            <Heart className={cn("size-5", favoritesOnly && "fill-current")} />
          </button>
        </div>
        <p className="mt-1 text-sm text-steel">{copy.libraryLead}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="min-w-0">
            <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{copy.filterType}</span>
            <SelectMenu ariaLabel={copy.filterType} value={typeFilter} highlight={typeFilter !== "all"} options={[{ value: "all", label: copy.filterAll }, { value: "song", label: copy.typeSong }, { value: "instrumental", label: copy.typeMusic }]} onChange={setTypeFilter} />
          </div>
          <div className="min-w-0">
            <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{copy.filterGenre}</span>
            <SelectMenu ariaLabel={copy.filterGenre} value={genreFilter} highlight={genreFilter !== "all"} options={[{ value: "all", label: copy.filterAll }, ...[...new Set(libraryTracks.map((item) => item.genre).filter(Boolean))].map((item) => ({ value: item!, label: item! }))]} onChange={setGenreFilter} />
          </div>
          <div className="min-w-0">
            <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{copy.filterStyle}</span>
            <SelectMenu ariaLabel={copy.filterStyle} value={styleFilter} highlight={styleFilter !== "all"} options={[{ value: "all", label: copy.filterAll }, ...[...new Set(libraryTracks.map((item) => item.style).filter(Boolean))].map((item) => ({ value: item!, label: item! }))]} onChange={setStyleFilter} />
          </div>
          <div className="min-w-0">
            <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{copy.filterPurpose}</span>
            <SelectMenu ariaLabel={copy.filterPurpose} value={purposeFilter} highlight={purposeFilter !== "all"} options={[{ value: "all", label: copy.filterAll }, ...[...new Set(libraryTracks.map((item) => item.purpose).filter(Boolean))].map((item) => ({ value: item!, label: item! }))]} onChange={setPurposeFilter} />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {!user ? <p className="py-16 text-center text-sm text-steel">{copy.loginToGenerate}</p> : null}
          {user && !visibleTracks.length ? <p className="py-16 text-center text-sm text-steel">{copy.emptyLibrary}</p> : null}
          {visibleTracks.map((track) => {
            const tags = [track.genre, track.style, track.mood, track.purpose].filter(Boolean) as string[];
            const creating = track.status === "creating";
            const failed = track.status === "failed";
            const ready = Boolean(track.url) && !creating && !failed;
            const liked = favorites.includes(track.id);
            const rated = feedback.voteForMessage(track.id) === 1;
            const catalogModelId = track.provider && track.modelId ? musicDbId(track.provider, track.modelId) : track.modelId ?? "";
            return (
            <article key={track.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <button type="button" title={liked ? copy.favoriteRemove : copy.favorite} aria-label={liked ? copy.favoriteRemove : copy.favorite} aria-pressed={liked} onClick={() => toggleFavorite(track.id)} className={cn("grid size-8 shrink-0 self-center place-items-center rounded-lg hover:bg-mist", liked ? "text-accent-brand" : "text-steel")}><Heart className={cn("size-4", liked && "fill-current")} /></button>
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-mist text-accent-brand">
                  {track.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.coverUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                  ) : null}
                  <button
                    type="button"
                    aria-label={copy.play}
                    disabled={!ready}
                    onClick={() => setPlayingId(playingId === track.id ? null : track.id)}
                    className={cn("relative z-[1] grid size-full place-items-center disabled:opacity-40", track.coverUrl && "bg-black/25 text-white")}
                  >
                    {creating ? <LoaderCircle className="size-7 animate-spin" /> : playingId === track.id ? <Music2 className="size-7" /> : <Play className="size-7" />}
                  </button>
                  <button
                    type="button"
                    title={ui.createCover}
                    aria-label={ui.createCover}
                    disabled={creating || track.id.startsWith("pending-")}
                    onClick={() => openCover(track)}
                    className={cn("absolute end-1 bottom-1 z-[2] grid size-5 place-items-center disabled:opacity-30", track.coverUrl ? "text-white/85 hover:text-white" : "text-steel/70 hover:text-text")}
                  >
                    <Pencil className="size-3 drop-shadow" />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {editingId === track.id ? (
                        <input
                          defaultValue={displayMusicTitle(track.title, track.prompt, track.requestId ?? track.id, untitledTrackLabel(locale))}
                          maxLength={MUSIC_TITLE_MAX}
                          autoFocus
                          onBlur={(event) => void renameTrack(track, event.currentTarget.value)}
                          onKeyDown={(event) => { if (event.key === "Enter") void renameTrack(track, event.currentTarget.value); }}
                          className="h-8 w-full rounded-lg border border-border px-2 text-sm"
                        />
                      ) : (
                        <button type="button" onClick={() => ready && setEditingId(track.id)} className="group flex max-w-full items-center gap-1 text-left">
                          <span className="truncate font-semibold text-text">{displayMusicTitle(track.title, track.prompt, track.requestId ?? track.id, untitledTrackLabel(locale))}</span>
                          {ready ? <Pencil className="size-3.5 shrink-0 text-steel opacity-0 group-hover:opacity-100" /> : null}
                        </button>
                      )}
                      <p className="truncate text-xs text-steel">{track.modelLabel}</p>
                    </div>
                    {creating ? (
                      <span className="shrink-0 text-xs font-medium text-emerald-600">{ui.creating}</span>
                    ) : failed ? (
                      <span className="shrink-0 text-xs font-medium text-rose-600">{ui.createFailed}</span>
                    ) : (
                      <span className="shrink-0 text-[1.125rem] font-bold leading-none tabular-nums text-steel">{track.durationSec ? formatTrackTime(track.durationSec) : "—"}</span>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate" title={tags.join(", ")}>
                      {tags.map((tag) => (
                        <span key={tag} className="mr-1.5 inline-block rounded-full bg-mist px-2 py-0.5 text-[11px] text-steel">{tag}</span>
                      ))}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Menu ariaLabel={copy.download} triggerClassName="grid size-8 place-items-center rounded-lg text-steel hover:bg-mist disabled:opacity-40" trigger={<Download className="size-4" />} panelClassName="w-32">
                        {(close) => (
                          <>
                            <MenuItem onClick={() => { window.open(`${track.url}?download=${encodeURIComponent(`${track.title}.mp3`)}`, "_blank"); close(); }}>{copy.downloadMp3}</MenuItem>
                            {track.formats.includes("wav") ? <MenuItem onClick={() => { window.open(`${track.url}?download=${encodeURIComponent(`${track.title}.wav`)}`, "_blank"); close(); }}>{copy.downloadWav}</MenuItem> : null}
                          </>
                        )}
                      </Menu>
                      <button type="button" title={copy.share} disabled={!ready} onClick={() => void navigator.share?.({ title: track.title, url: `${window.location.origin}${track.url}` }).catch(() => navigator.clipboard.writeText(`${window.location.origin}${track.url}`))} className="grid size-8 place-items-center rounded-lg text-steel hover:bg-mist disabled:opacity-40"><Share2 className="size-4" /></button>
                      <button type="button" title={copy.rate} disabled={!ready} aria-pressed={rated} onClick={() => saveModelFeedback(track.id, catalogModelId, track.modelLabel, 1)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-mist disabled:opacity-40", rated ? "bg-emerald-500/10 text-emerald-500" : "text-steel")}><ThumbsUp className={cn("size-4", rated && "fill-current")} /></button>
                      <button type="button" title={copy.delete} onClick={() => setPendingDelete(track)} className="grid size-8 place-items-center rounded-lg text-steel hover:bg-mist hover:text-rose-600"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
              {ready && !track.id.startsWith("pending-") ? (
                <TrackDurationSync url={track.url} storedSec={track.durationSec} onDuration={(seconds) => persistDuration(track.id, seconds)} />
              ) : null}
              {playingId === track.id && ready ? (
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" title={ui.closePlayer} aria-label={ui.closePlayer} onClick={() => setPlayingId(null)} className="grid size-8 shrink-0 place-items-center rounded-lg text-steel hover:bg-mist">
                    <X className="size-4" />
                  </button>
                  <MusicPlayer src={track.url} durationSec={track.durationSec} onDuration={(seconds) => persistDuration(track.id, seconds)} />
                </div>
              ) : null}
            </article>
            );
          })}
        </div>
      </section>

      {coverTrack ? createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={ui.coverTitle}>
          <div className="w-full max-w-2xl rounded-[26px] border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-text">{ui.coverTitle}</h2>
              <button type="button" aria-label={ui.close} disabled={coverBusy} onClick={closeCover} className="grid size-8 place-items-center rounded-lg text-steel hover:bg-mist disabled:opacity-40">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                <input ref={coverFileRef} type="file" accept={SONG_COVER_ACCEPT} className="sr-only" onChange={(event) => { void pickCoverFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <button
                  type="button"
                  title={coverPreview ? ui.coverReplace : ui.coverUpload}
                  aria-label={coverPreview ? ui.coverReplace : ui.coverUpload}
                  disabled={coverBusy}
                  onClick={() => coverFileRef.current?.click()}
                  className="relative grid size-36 place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-mist text-steel hover:border-accent-brand hover:text-text disabled:opacity-50"
                >
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : null}
                  <span className={cn("relative z-[1] grid size-9 place-items-center rounded-full", coverPreview ? "bg-black/45 text-white" : "bg-surface text-steel")}>
                    {coverPreview ? <Pencil className="size-4" /> : <Plus className="size-5" />}
                  </span>
                </button>
                <p className="mt-2 max-w-36 text-[10px] leading-snug text-steel">{ui.coverFileHint}</p>
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium text-text">
                  {ui.coverWords} ({ui.coverOptional})
                  <div className="relative mt-1.5">
                    <input
                      value={coverWords}
                      maxLength={SONG_COVER_WORDS_MAX}
                      onChange={(event) => setCoverWords(event.target.value.slice(0, SONG_COVER_WORDS_MAX))}
                      className="h-11 w-full rounded-xl border border-border bg-bg px-3 pe-16 text-sm outline-none focus:border-accent-brand"
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-steel">{coverWords.length}/{SONG_COVER_WORDS_MAX}</span>
                  </div>
                </label>
                <label className="mt-3 block text-sm font-medium text-text">
                  {ui.coverDescription} ({ui.coverOptional})
                  <div className="relative mt-1.5">
                    <style>{`@keyframes cover-voice{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){@keyframes cover-voice{0%,100%{transform:none}}}`}</style>
                    <textarea
                      value={coverText}
                      maxLength={SONG_COVER_DESC_MAX}
                      onChange={(event) => setCoverText(event.target.value.slice(0, SONG_COVER_DESC_MAX))}
                      rows={5}
                      className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2 pb-10 pe-28 text-sm outline-none focus:border-accent-brand"
                    />
                    <div className="absolute end-2 bottom-2 flex items-center gap-1.5">
                      <span className="text-xs tabular-nums text-steel">{coverText.length}/{SONG_COVER_DESC_MAX}</span>
                      {coverRecording ? (
                        <>
                          <VoiceBars />
                          <span className="text-[10px] font-medium tabular-nums text-rose-600">{formatRecordClock(coverRecordSec)}</span>
                        </>
                      ) : null}
                      <button
                        type="button"
                        title={ui.coverMic}
                        aria-label={ui.coverMic}
                        disabled={coverBusy}
                        onClick={() => void toggleCoverMic()}
                        className={cn("grid size-8 place-items-center rounded-lg hover:bg-mist", coverRecording ? "text-rose-600" : "text-steel")}
                      >
                        {coverTranscribing ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}
                      </button>
                    </div>
                  </div>
                </label>
                <button type="button" onClick={addCoverLyrics} className="mt-2 text-xs font-medium text-accent-brand hover:underline">
                  {ui.coverAddLyrics}
                </button>
                {coverNotice ? <p className="mt-3 text-sm text-rose-600">{coverNotice}</p> : null}
                <Button type="button" className="mt-4 w-full" disabled={coverBusy || coverTranscribing} onClick={() => void generateCover()}>
                  {coverBusy ? <LoaderCircle className="me-2 size-4 animate-spin" /> : null}
                  {withCreditGlyphs(`${ui.coverGenerate}${coverPrice > 0 ? ` ${formatTokensAsCredits(coverPrice, locale, "price")}` : ""}`)}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {editorOpen ? createPortal(
        <div className="fixed inset-0 z-[400] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={mode === "song" ? copy.text : copy.description} onClick={() => setEditorOpen(false)}>
          <div className="flex h-[min(86dvh,760px)] w-full max-w-3xl flex-col rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-text">{mode === "song" ? copy.text : copy.description}</h3>
              <button type="button" aria-label={ui.close} onClick={() => setEditorOpen(false)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-mist"><X className="size-4" /></button>
            </div>
            <div className="relative min-h-0 flex-1">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value.slice(0, limit))}
                placeholder={selected?.video_input ? "Настроение можно не писать — модель смотрит ролик" : mode === "song" ? copy.promptPlaceholder : copy.musicPlaceholder}
                className="h-full min-h-0 w-full resize-none rounded-xl border border-border bg-bg px-4 pb-8 pt-3 text-sm leading-relaxed text-text outline-none placeholder:text-steel/75 focus:border-accent-brand"
                maxLength={limit}
                autoFocus
              />
              <p className="pointer-events-none absolute bottom-2.5 end-3 text-xs tabular-nums text-steel">{prompt.length} {copy.charsOf} {limit}</p>
            </div>
          </div>
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
            const id = pendingDelete.id;
            const local = pendingDelete.status === "creating" || pendingDelete.status === "failed" || id.startsWith("pending-");
            setPendingDelete(null);
            if (local) {
              removePendingMusicJob(id);
              if (playingId === id) setPlayingId(null);
              return;
            }
            void fetch(`/api/music/tracks/${id}`, { method: "DELETE" }).then((response) => {
              if (!response.ok) return;
              setTracks((items) => items.filter((item) => item.id !== id));
              window.dispatchEvent(new Event("genora-gallery-change"));
            });
          }}
        />
      ) : null}
    </main>
  );
}
