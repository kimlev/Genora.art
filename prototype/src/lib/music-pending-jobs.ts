import type { MusicMode } from "@/lib/catalog/music-studio";
import { isPageDisconnect, waitForGenerationJob, type PublicGenerationJob } from "@/lib/generation-job-client";
import { publicErrorMessage } from "@/lib/public-error";

export type PendingMusicTrack = {
  id: string;
  title: string;
  mode: MusicMode;
  modelLabel: string;
  genre: string | null;
  style: string | null;
  mood: string | null;
  purpose: string | null;
  durationSec: number | null;
  url: string;
  formats: string[];
  coverUrl?: string | null;
  lyrics: string | null;
  prompt: string;
  createdAt: string;
  status: "creating" | "failed";
  error?: string;
};

export type MusicTrackRecord = PendingMusicTrack & {
  status?: "ready" | "creating" | "failed";
  requestId?: string;
  provider?: string;
  modelId?: string;
};

type JobBody = Record<string, unknown>;

const STORAGE_KEY = "genora-music-pending";
const listeners = new Set<() => void>();
const watching = new Set<string>();
let jobs: PendingMusicTrack[] = [];

function notify() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    jobs = Array.isArray(parsed) ? parsed.filter((item): item is PendingMusicTrack => item && typeof item === "object" && typeof (item as PendingMusicTrack).id === "string") : [];
  } catch {
    jobs = [];
  }
}

if (typeof window !== "undefined") load();

export function listPendingMusicJobs() {
  return jobs;
}

export function subscribeMusicJobs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function removePendingMusicJob(id: string) {
  jobs = jobs.filter((item) => item.id !== id);
  persist();
  notify();
}

function replacePendingId(from: string, to: string) {
  jobs = jobs.map((item) => item.id === from ? { ...item, id: to } : item);
  persist();
  notify();
}

function trackFromJob(job: PublicGenerationJob): MusicTrackRecord | null {
  const track = job.result?.track;
  if (!track || typeof track !== "object" || typeof (track as MusicTrackRecord).id !== "string") return null;
  return track as MusicTrackRecord;
}

function markFailed(id: string, error: unknown) {
  jobs = jobs.map((item) => item.id === id
    ? { ...item, status: "failed" as const, error: publicErrorMessage(error instanceof Error ? error.message : "failed") }
    : item);
  persist();
  notify();
}

function watchMusicJob(id: string) {
  if (watching.has(id)) return;
  watching.add(id);
  void waitForGenerationJob(id)
    .then((ready) => {
      const track = trackFromJob(ready);
      if (!track) throw new Error("failed");
      removePendingMusicJob(id);
      window.dispatchEvent(new CustomEvent("genora-music-ready", { detail: track }));
    })
    .catch((error: unknown) => {
      if (isPageDisconnect(error)) return;
      markFailed(id, error);
    })
    .finally(() => { watching.delete(id); });
}

export function reconcilePendingMusicJobs(ready: MusicTrackRecord[]) {
  let changed = false;
  const remaining: PendingMusicTrack[] = [];
  for (const job of jobs) {
    if (job.status !== "creating") {
      remaining.push(job);
      continue;
    }
    const started = Date.parse(job.createdAt);
    if (Number.isFinite(started) && Date.now() - started > 12 * 60 * 1000) {
      remaining.push({ ...job, status: "failed" });
      changed = true;
      continue;
    }
    const match = ready.some((track) => (
      (track.title === job.title || (job.prompt && track.prompt === job.prompt))
      && Date.parse(track.createdAt) >= started - 5000
    ));
    if (match) {
      changed = true;
      continue;
    }
    remaining.push(job);
  }
  if (!changed) return;
  jobs = remaining;
  persist();
  notify();
}

export function hydrateCreatingMusicJobs() {
  if (typeof window === "undefined") return;
  void fetch("/api/generation-jobs", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { jobs?: PublicGenerationJob[] } | null) => {
      const creating = (data?.jobs ?? []).filter((job) => job.kind === "music" && job.status === "creating");
      if (!creating.length) return;
      let changed = false;
      for (const job of creating) {
        if (!jobs.some((item) => item.id === job.id)) {
          jobs = [{
            id: job.id,
            title: job.title || "Трек",
            mode: "song",
            modelLabel: job.modelLabel || "",
            genre: null,
            style: null,
            mood: null,
            purpose: null,
            durationSec: null,
            url: "",
            formats: ["mp3"],
            lyrics: null,
            prompt: job.title || "",
            createdAt: job.createdAt,
            status: "creating",
          }, ...jobs];
          changed = true;
        }
        watchMusicJob(job.id);
      }
      if (changed) {
        persist();
        notify();
      }
    })
    .catch(() => undefined);
}

export function startMusicJob(input: {
  title: string;
  mode: MusicMode;
  modelLabel: string;
  genre: string | null;
  style: string | null;
  mood: string | null;
  purpose: string | null;
  lyrics: string | null;
  prompt: string;
  body: JobBody;
}): string {
  const id = `pending-${crypto.randomUUID()}`;
  const job: PendingMusicTrack = {
    id,
    title: input.title,
    mode: input.mode,
    modelLabel: input.modelLabel,
    genre: input.genre,
    style: input.style,
    mood: input.mood,
    purpose: input.purpose,
    durationSec: null,
    url: "",
    formats: ["mp3"],
    lyrics: input.lyrics,
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
    status: "creating",
  };
  jobs = [job, ...jobs.filter((item) => item.id !== id)];
  persist();
  notify();
  void fetch("/api/music/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.body),
  })
    .then(async (response) => {
      window.dispatchEvent(new Event("genora-balance-changed"));
      const payload = await response.json() as { track?: MusicTrackRecord; job?: { id: string }; message?: string; error?: string };
      if (payload.job?.id) {
        replacePendingId(id, payload.job.id);
        watchMusicJob(payload.job.id);
        return;
      }
      if (!response.ok || !payload.track) throw new Error(payload.message || payload.error || "failed");
      removePendingMusicJob(id);
      window.dispatchEvent(new CustomEvent("genora-music-ready", { detail: payload.track }));
    })
    .catch((error: unknown) => {
      if (isPageDisconnect(error)) return;
      markFailed(id, error);
    });
  return id;
}
