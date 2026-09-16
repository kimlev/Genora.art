"use client";

import { useEffect, useSyncExternalStore } from "react";

const CHANGE_EVENT = "genora-usage-change";

export type UsageEntry = {
  id: string;
  timestamp: string;
  conversationId: string;
  chatTitle: string;
  chatDeleted?: boolean;
  model: string;
  modelId: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  billedTokens: number;
  failed?: boolean;
};

const seedSnapshot = "[]";
const storageKey = (email: string) => `genora-usage:${email}`;

function readEntries(email: string): UsageEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as UsageEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(email: string, entries: UsageEntry[]) {
  localStorage.setItem(storageKey(email), JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: email }));
}

export async function refreshUsageHistory(email: string): Promise<void> {
  const response = await fetch("/api/usage", { cache: "no-store" });
  if (!response.ok) throw new Error("usage_refresh_failed");
  const data = await response.json() as { entries?: Array<UsageEntry & { deleted?: boolean }> };
  if (!data.entries) throw new Error("usage_refresh_failed");
  writeEntries(email, data.entries.map((entry) => ({ ...entry, chatDeleted: entry.deleted ?? entry.chatDeleted })));
}

export function addUsageEntry(email: string, entry: UsageEntry): void {
  writeEntries(email, [entry, ...readEntries(email)]);
}

export function markConversationUsageDeleted(email: string, conversationId: string): void {
  writeEntries(email, readEntries(email).map((entry) => (
    entry.conversationId === conversationId ? { ...entry, chatDeleted: true } : entry
  )));
  void fetch("/api/usage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId }) }).catch(() => undefined);
}

export function useUsageHistory(email: string | null): UsageEntry[] {
  useEffect(() => {
    if (!email) return;
    void refreshUsageHistory(email).catch(() => undefined);
  }, [email]);
  const subscribe = (callback: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (email && event.key === storageKey(email)) callback();
    };
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === email) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  };
  const getSnapshot = () => email ? (localStorage.getItem(storageKey(email)) ?? seedSnapshot) : "[]";
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => email ? seedSnapshot : "[]");
  try {
    return JSON.parse(snapshot) as UsageEntry[];
  } catch {
    return [];
  }
}
