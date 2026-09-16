"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ImageGeneration = {
  conversationId: string;
  requestId: string;
  provider: string;
  modelId: string;
  modelLabel: string;
  prompt: string;
  size: string;
  format: string;
  style: string;
  reasoning: string | null;
  billedTokens: number;
  createdAt: string;
  images: Array<{ id: string; url: string; previewUrl?: string; title?: string }>;
  kind?: "photo" | "video";
  durationSec?: number | null;
  sound?: "on" | "off" | null;
};

export type ImageConversation = {
  id: string;
  title: string;
  updatedAt: string;
  generations: ImageGeneration[];
};

type ImageHistoryContextValue = {
  conversations: ImageConversation[];
  activeConversationId: string | null;
  activeConversation: ImageConversation | null;
  loading: boolean;
  loadFailed: boolean;
  setActiveConversationId: (id: string | null) => void;
  startNewConversation: () => void;
  addGeneration: (generation: ImageGeneration, conversation: Omit<ImageConversation, "generations">) => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteGeneration: (requestId: string) => Promise<void>;
  renameMedia: (kind: "photo" | "video", assetId: string, title: string) => Promise<void>;
};

const ImageHistoryContext = createContext<ImageHistoryContextValue | null>(null);
const emptyImageConversations: ImageConversation[] = [];

export function ImageHistoryProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<ImageConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!userId) return;
    let active = true;
    let inFlight = false;
    let reloadQueued = false;
    let hasLoaded = false;
    const controller = new AbortController();
    const load = async () => {
      if (!active) return;
      if (inFlight) {
        reloadQueued = true;
        return;
      }
      inFlight = true;
      reloadQueued = false;
      if (!hasLoaded) {
        setConversations([]);
        setActiveConversationId(null);
        setLoadFailed(false);
        setLoading(true);
      }
      try {
        const response = await fetch("/api/images/generations", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
        if (!response.ok) throw new Error("history_load_failed");
        const payload = await response.json() as { conversations?: ImageConversation[] };
        if (!active) return;
        const loaded = payload.conversations ?? [];
        setConversations(loaded);
        setActiveConversationId((current) => current && loaded.some((item) => item.id === current) ? current : loaded[0]?.id ?? null);
        setLoadedUserId(userId);
        hasLoaded = true;
        setLoadFailed(false);
      } catch {
        if (!active) return;
        setLoadFailed(true);
        setLoadedUserId(userId);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
        if (active && reloadQueued) void load();
      }
    };
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    const refresh = () => { void load(); };
    window.addEventListener("genora-history-refresh", refresh);
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
      controller.abort();
      window.removeEventListener("genora-history-refresh", refresh);
    };
  }, [ready, userId]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    window.dispatchEvent(new Event("genora-new-image-conversation"));
  }, []);

  const addGeneration = useCallback((generation: ImageGeneration, conversation: Omit<ImageConversation, "generations">) => {
    setConversations((items) => {
      const existing = items.find((item) => item.id === conversation.id);
      const next: ImageConversation = existing
        ? { ...existing, ...conversation, generations: [generation, ...existing.generations.filter((item) => item.requestId !== generation.requestId)] }
        : { ...conversation, generations: [generation] };
      return [next, ...items.filter((item) => item.id !== conversation.id)];
    });
    setActiveConversationId(conversation.id);
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const response = await fetch(`/api/images/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("rename_failed");
    const payload = await response.json() as { conversation: Omit<ImageConversation, "generations"> };
    setConversations((items) => items.map((item) => item.id === id ? { ...item, ...payload.conversation } : item));
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const response = await fetch(`/api/images/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("delete_failed");
    setConversations((items) => items.filter((item) => item.id !== id));
    setActiveConversationId((current) => current === id ? null : current);
    if (activeConversationId === id) window.dispatchEvent(new Event("genora-new-image-conversation"));
    window.dispatchEvent(new Event("genora-gallery-change"));
  }, [activeConversationId]);

  const deleteGeneration = useCallback(async (requestId: string) => {
    const response = await fetch(`/api/images/generations/${encodeURIComponent(requestId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("delete_failed");
    setConversations((items) => items.flatMap((item) => {
      const generations = item.generations.filter((generation) => generation.requestId !== requestId);
      if (!generations.length) return [];
      return [{ ...item, generations }];
    }));
    window.dispatchEvent(new Event("genora-gallery-change"));
  }, []);

  const renameMedia = useCallback(async (kind: "photo" | "video", assetId: string, title: string) => {
    const response = await fetch(`/api/media/titles/${encodeURIComponent(assetId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, title }),
    });
    const payload = await response.json() as { title?: string };
    if (!response.ok || typeof payload.title !== "string") throw new Error("rename_failed");
    setConversations((items) => items.map((conversation) => ({
      ...conversation,
      generations: conversation.generations.map((generation) => (generation.kind ?? "photo") !== kind ? generation : ({
        ...generation,
        images: generation.images.map((image) => image.id === assetId ? { ...image, title: payload.title } : image),
      })),
    })));
  }, []);

  const visibleConversations = userId && loadedUserId === userId ? conversations : emptyImageConversations;
  const visibleActiveId = userId && loadedUserId === userId ? activeConversationId : null;
  const activeConversation = useMemo(() => visibleConversations.find((item) => item.id === visibleActiveId) ?? null, [visibleActiveId, visibleConversations]);
  const historyLoading = !ready || Boolean(userId && (loadedUserId !== userId || loading));
  const value = useMemo(() => ({ conversations: visibleConversations, activeConversationId: visibleActiveId, activeConversation, loading: historyLoading, loadFailed, setActiveConversationId, startNewConversation, addGeneration, renameConversation, renameMedia, deleteConversation, deleteGeneration }), [activeConversation, visibleActiveId, addGeneration, deleteConversation, deleteGeneration, historyLoading, loadFailed, renameConversation, renameMedia, startNewConversation, visibleConversations]);

  return <ImageHistoryContext.Provider value={value}>{children}</ImageHistoryContext.Provider>;
}

export function useImageHistory(): ImageHistoryContextValue {
  const value = useContext(ImageHistoryContext);
  if (!value) throw new Error("useImageHistory must be used within ImageHistoryProvider");
  return value;
}
