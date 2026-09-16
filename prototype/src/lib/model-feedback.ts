"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "genora-model-feedback";
const CHANGE_EVENT = "genora-feedback-change";

export type ModelVote = -1 | 1;

type FeedbackEntry = {
  modelName: string;
  vote: ModelVote;
};

type FeedbackState = Record<string, FeedbackEntry>;

function normalizeState(value: unknown): FeedbackState {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, { modelName?: unknown; vote?: unknown; rating?: unknown }>).flatMap(([messageId, entry]) => {
    if (typeof entry?.modelName !== "string") return [];
    const vote = entry.vote === 1 || entry.vote === -1 ? entry.vote : typeof entry.rating === "number" ? (entry.rating >= 3 ? 1 : -1) : null;
    return vote ? [[messageId, { modelName: entry.modelName, vote } satisfies FeedbackEntry]] : [];
  }));
}

function readState(): FeedbackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "{}";
}

export function saveModelFeedback(messageId: string, modelId: string, modelName: string, vote: ModelVote): void {
  const state = readState();
  if (state[messageId]?.vote === vote) delete state[messageId];
  else state[messageId] = { modelName, vote };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  void fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messageId, modelId, modelName, vote }),
  }).catch(() => undefined);
}

export function useModelFeedback() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "{}");
  useEffect(() => {
    void fetch("/api/feedback", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { feedback?: FeedbackState };
      if (!data.feedback) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.feedback));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }).catch(() => undefined);
  }, []);
  let state: FeedbackState = {};
  try {
    state = normalizeState(JSON.parse(snapshot));
  } catch {
    state = {};
  }

  return {
    voteForMessage: (messageId: string) => state[messageId]?.vote,
    votesForModel: (modelName: string) =>
      Object.values(state)
        .filter((entry) => entry.modelName === modelName)
        .map((entry) => entry.vote),
  };
}
