"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { formatTrackTime } from "@/lib/catalog/music-studio";
import { musicStudioUiCopy } from "@/lib/i18n/copy/music-studio-ui-copy";
import { cn } from "@/lib/utils";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TIME_CLASS = "shrink-0 text-[1.125rem] font-bold tabular-nums leading-none text-text";

export function measuredAudioSeconds(value: number) {
  return Number.isFinite(value) && value > 0 && value < 3600 ? Math.round(value) : null;
}

export function MusicPlayer({
  src,
  durationSec,
  onDuration,
  className,
}: {
  src: string;
  durationSec?: number | null;
  onDuration?: (seconds: number) => void;
  className?: string;
}) {
  const { locale } = useLocale();
  const ui = musicStudioUiCopy(locale);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0);
  const [actual, setActual] = useState(durationSec ?? 0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setCurrent(0);
    setPaused(false);
    setActual(durationSec ?? 0);
  }, [src, durationSec]);

  const applyDuration = (value: number) => {
    const seconds = measuredAudioSeconds(value);
    if (!seconds) return;
    setActual(seconds);
    onDuration?.(seconds);
  };

  const duration = actual || durationSec || 0;

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-mist px-2 py-1.5", className)}>
      <button
        type="button"
        aria-label={paused ? ui.play : ui.pause}
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) void audio.play();
          else audio.pause();
        }}
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-text text-bg"
      >
        {paused ? <Play className="size-4 translate-x-px" /> : <Pause className="size-4" />}
      </button>
      <span className={TIME_CLASS}>{formatTrackTime(current)}</span>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.001)}
        step={0.1}
        value={Math.min(current, duration || current)}
        disabled={!duration}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          const audio = audioRef.current;
          if (audio && Number.isFinite(next)) {
            audio.currentTime = next;
            setCurrent(next);
          }
        }}
        className="min-w-0 flex-1 accent-text disabled:opacity-40"
      />
      <span className={TIME_CLASS}>{formatTrackTime(duration)}</span>
      <button
        type="button"
        aria-label={muted ? ui.unmute : ui.mute}
        onClick={() => {
          const audio = audioRef.current;
          const next = !muted;
          setMuted(next);
          if (audio) audio.muted = next;
        }}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-steel hover:bg-surface"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        autoPlay
        className="hidden"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onLoadedMetadata={(event) => applyDuration(event.currentTarget.duration)}
        onDurationChange={(event) => applyDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
      />
    </div>
  );
}

export function TrackDurationSync({
  url,
  storedSec,
  onDuration,
}: {
  url: string;
  storedSec?: number | null;
  onDuration: (seconds: number) => void;
}) {
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    const apply = () => {
      const seconds = measuredAudioSeconds(audio.duration);
      if (seconds && seconds !== storedSec) onDuration(seconds);
    };
    audio.addEventListener("loadedmetadata", apply);
    audio.addEventListener("durationchange", apply);
    audio.src = url;
    return () => {
      audio.removeEventListener("loadedmetadata", apply);
      audio.removeEventListener("durationchange", apply);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [onDuration, storedSec, url]);
  return null;
}
