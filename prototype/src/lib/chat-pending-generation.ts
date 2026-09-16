import type { Conversation } from "@/lib/mock/conversations";

const GENERATING_KEY = (userId: string) => `genora-generating:${userId}`;
const PENDING_KEY = (userId: string) => `genora-pending-chats:${userId}`;
const MAX_AGE_MS = 50 * 60_000;

type GeneratingEntry = { id: string; at: number };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function readGeneratingEntries(userId: string): GeneratingEntry[] {
  const raw = readJson<unknown>(GENERATING_KEY(userId), []);
  const now = Date.now();
  const entries = (Array.isArray(raw) ? raw : [])
    .map((item) => {
      if (typeof item === "string") return { id: item, at: now };
      if (item && typeof item === "object" && typeof (item as GeneratingEntry).id === "string") {
        return { id: (item as GeneratingEntry).id, at: Number((item as GeneratingEntry).at) || now };
      }
      return null;
    })
    .filter((item): item is GeneratingEntry => item != null && now - item.at < MAX_AGE_MS);
  writeJson(GENERATING_KEY(userId), entries);
  return entries;
}

export function readGeneratingIds(userId: string): string[] {
  return readGeneratingEntries(userId).map((item) => item.id);
}

export function generatingStartedAt(userId: string, id: string): number {
  return readGeneratingEntries(userId).find((item) => item.id === id)?.at ?? 0;
}

export function writeGeneratingIds(userId: string, ids: string[]) {
  const now = Date.now();
  const previous = readJson<unknown>(GENERATING_KEY(userId), []);
  const started = new Map<string, number>();
  if (Array.isArray(previous)) {
    for (const item of previous) {
      if (typeof item === "string") started.set(item, now);
      else if (item && typeof item === "object" && typeof (item as GeneratingEntry).id === "string") {
        started.set((item as GeneratingEntry).id, Number((item as GeneratingEntry).at) || now);
      }
    }
  }
  writeJson(GENERATING_KEY(userId), ids.map((id) => ({ id, at: started.get(id) ?? now })));
}

export function readPendingChats(userId: string): Conversation[] {
  const raw = readJson<unknown>(PENDING_KEY(userId), []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is Conversation => Boolean(item && typeof item === "object" && typeof (item as Conversation).id === "string"));
}

export function writePendingChat(userId: string, conversation: Conversation) {
  const next = [conversation, ...readPendingChats(userId).filter((item) => item.id !== conversation.id)].slice(0, 8);
  writeJson(PENDING_KEY(userId), next);
}

export function removePendingChat(userId: string, conversationId: string) {
  writeJson(PENDING_KEY(userId), readPendingChats(userId).filter((item) => item.id !== conversationId));
}

const SEEN_JOBS_KEY = (userId: string) => `genora-seen-jobs:${userId}`;
const APPLIED_JOBS_KEY = (userId: string) => `genora-applied-jobs:${userId}`;
const MAX_JOB_IDS = 400;

function readIdSet(key: string): Set<string> {
  const raw = readJson<unknown>(key, []);
  return new Set((Array.isArray(raw) ? raw : []).filter((item): item is string => typeof item === "string"));
}

function writeIdSet(key: string, ids: Iterable<string>) {
  writeJson(key, [...ids].slice(-MAX_JOB_IDS));
}

export function readSeenJobIds(userId: string): Set<string> {
  return readIdSet(SEEN_JOBS_KEY(userId));
}

export function writeSeenJobIds(userId: string, ids: Iterable<string>) {
  writeIdSet(SEEN_JOBS_KEY(userId), ids);
}

export function readAppliedJobIds(userId: string): Set<string> {
  return readIdSet(APPLIED_JOBS_KEY(userId));
}

export function writeAppliedJobIds(userId: string, ids: Iterable<string>) {
  writeIdSet(APPLIED_JOBS_KEY(userId), ids);
}

export function mergePendingChats(loaded: Conversation[], pending: Conversation[], generatingIds: string[]): Conversation[] {
  if (!pending.length || !generatingIds.length) return loaded;
  const loadedIds = new Set(loaded.map((item) => item.id));
  const merged = loaded.map((conversation) => {
    if (!generatingIds.includes(conversation.id)) return conversation;
    const local = pending.find((item) => item.id === conversation.id);
    if (!local || local.messages.length <= conversation.messages.length) return conversation;
    return { ...conversation, title: conversation.title || local.title, messages: local.messages };
  });
  const extras = pending.filter((item) => generatingIds.includes(item.id) && !loadedIds.has(item.id));
  return extras.length ? [...extras, ...merged] : merged;
}
