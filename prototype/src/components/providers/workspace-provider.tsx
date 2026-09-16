"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import type { Conversation } from "@/lib/mock/conversations";
import type { ChatMessage } from "@/lib/mock/chat-demo";
import { markConversationUsageDeleted } from "@/lib/usage-history";
import type { PublicGenerationJob } from "@/lib/generation-job-client";
import {
  generatingStartedAt,
  mergePendingChats,
  readAppliedJobIds,
  readGeneratingIds,
  readPendingChats,
  readSeenJobIds,
  removePendingChat,
  writeAppliedJobIds,
  writeGeneratingIds,
  writeSeenJobIds,
} from "@/lib/chat-pending-generation";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type WorkspaceContextValue = {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  /** Выбранный агент — фильтрует список чатов слева */
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
  visibleConversations: Conversation[];
  loading: boolean;
  generatingIds: string[];
  unreadIds: string[];
  busySurfaces: Array<"chat" | "images" | "audio">;
  unreadSurfaces: Array<"chat" | "images" | "audio">;
  beginGeneration: (id: string) => void;
  finishGeneration: (id: string, markUnread: boolean) => void;
  startNewChat: (options?: { keepAgent?: boolean }) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = useAppPathname();
  const { locale } = useLocale();
  const userEmail = user?.email ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<
    string | null
  >(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const syncedSnapshotRef = useRef<string | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const explicitNewChatRef = useRef(false);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [busySurfaces, setBusySurfaces] = useState<Array<"chat" | "images" | "audio">>([]);
  const [unreadSurfaces, setUnreadSurfaces] = useState<Array<"chat" | "images" | "audio">>([]);
  const appliedJobIdsRef = useRef<Set<string>>(new Set());
  const creatingJobIdsRef = useRef<Set<string>>(new Set());
  const seenJobIdsRef = useRef<Set<string>>(new Set());
  const conversationJobsRef = useRef<Map<string, string[]>>(new Map());
  const surfaceJobsRef = useRef<Map<"chat" | "images" | "audio", string[]>>(new Map());
  const activeConversationIdRef = useRef<string | null>(null);
  const currentSurfaceRef = useRef<"chat" | "images" | "audio">("chat");
  const activeConversationStorageKey = `genora-active-chat:${user?.id ?? `guest-${locale}`}`;
  const workspaceEnabled = !pathname.startsWith("/profile")
    && !pathname.startsWith("/admin")
    && !pathname.startsWith("/battle")
    && !["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/preview-login"].includes(pathname);

  useEffect(() => {
    if (!ready || !workspaceEnabled) return;
    const scope = user?.id ? `user:${user.id}` : `guest:${locale}`;
    if (loadedScope === scope && (!user?.id || loadedUserId === user.id)) return;
    let active = true;
    const load = async () => {
      if (!userEmail) {
        explicitNewChatRef.current = true;
        setLoadedScope(scope);
        syncedSnapshotRef.current = null;
        setLoadedUserId(null);
        setConversations([]);
        setActiveConversationIdState(null);
        setActiveAgentId(null);
        return;
      }
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("workspace_load_failed");
        const data = await response.json() as { conversations?: Conversation[] };
        let loaded = data.conversations ?? [];
        const legacy = localStorage.getItem(`genora-chats:${userEmail}`);
        if (loaded.length === 0 && legacy) {
          loaded = JSON.parse(legacy) as Conversation[];
          await fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversations: loaded }) });
          localStorage.removeItem(`genora-chats:${userEmail}`);
        }
        if (!active) return;
        const generating = user?.id ? readGeneratingIds(user.id) : [];
        const pending = user?.id ? readPendingChats(user.id) : [];
        const merged = mergePendingChats(loaded, pending, generating);
        setLoadedScope(scope);
        syncedSnapshotRef.current = JSON.stringify(merged);
        setConversations(merged);
        const storedActive = sessionStorage.getItem(activeConversationStorageKey);
        explicitNewChatRef.current = storedActive === "__new__";
        setActiveConversationIdState(storedActive === "__new__"
          ? null
          : storedActive && merged.some((item) => item.id === storedActive)
            ? storedActive
            : merged[0]?.id ?? null);
      } catch {
        if (!active) return;
        const generating = user?.id ? readGeneratingIds(user.id) : [];
        const pending = user?.id ? readPendingChats(user.id) : [];
        const merged = mergePendingChats([], pending, generating);
        setLoadedScope(scope);
        setConversations(merged);
        const storedActive = sessionStorage.getItem(activeConversationStorageKey);
        setActiveConversationIdState(storedActive && storedActive !== "__new__" && merged.some((item) => item.id === storedActive)
          ? storedActive
          : merged[0]?.id ?? null);
      }
      setLoadedUserId(user?.id ?? null);
      setActiveAgentId(null);
    };
    void load();
    return () => { active = false; };
  }, [activeConversationStorageKey, loadedScope, loadedUserId, locale, ready, user?.id, userEmail, workspaceEnabled]);

  useEffect(() => {
    if (!ready || !workspaceEnabled || !user?.id || loadedUserId !== user.id) return;
    const snapshot = JSON.stringify(conversations);
    if (snapshot === syncedSnapshotRef.current) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/workspace", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversations }),
      }).then((response) => {
        if (response.ok) syncedSnapshotRef.current = snapshot;
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [conversations, loadedUserId, ready, user?.id, workspaceEnabled]);

  const visibleConversations = conversations;
  const currentScope = user?.id ? `user:${user.id}` : `guest:${locale}`;
  const workspaceLoading = !ready || (user?.id ? loadedUserId !== user.id : loadedScope !== currentScope);

  activeConversationIdRef.current = activeConversationId;

  const currentSurface = pathname.startsWith("/gallery") || pathname.startsWith("/create-foto-video") || pathname.startsWith("/images") || pathname.startsWith("/image-examples") || pathname.startsWith("/video-examples")
    ? "images"
    : pathname.startsWith("/music") || pathname.startsWith("/songs")
      ? "audio"
      : "chat";
  currentSurfaceRef.current = currentSurface;

  const persistSeenJobs = useCallback((ids: Iterable<string>) => {
    for (const id of ids) seenJobIdsRef.current.add(id);
    if (user?.id) writeSeenJobIds(user.id, seenJobIdsRef.current);
  }, [user?.id]);

  const persistAppliedJobs = useCallback((id: string) => {
    appliedJobIdsRef.current.add(id);
    if (user?.id) writeAppliedJobIds(user.id, appliedJobIdsRef.current);
  }, [user?.id]);

  const rememberConversationJob = (conversationId: string, jobId: string) => {
    const current = conversationJobsRef.current.get(conversationId) ?? [];
    if (!current.includes(jobId)) conversationJobsRef.current.set(conversationId, [...current, jobId]);
  };

  const rememberSurfaceJob = (surface: "chat" | "images" | "audio", jobId: string) => {
    const current = surfaceJobsRef.current.get(surface) ?? [];
    if (!current.includes(jobId)) surfaceJobsRef.current.set(surface, [...current, jobId]);
  };

  useEffect(() => {
    setUnreadSurfaces((current) => current.filter((item) => item !== currentSurface));
    persistSeenJobs(surfaceJobsRef.current.get(currentSurface) ?? []);
  }, [currentSurface, persistSeenJobs]);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) {
      explicitNewChatRef.current = false;
      sessionStorage.setItem(activeConversationStorageKey, id);
      setUnreadIds((current) => current.filter((item) => item !== id));
      persistSeenJobs(conversationJobsRef.current.get(id) ?? []);
    }
    setActiveConversationIdState(id);
  }, [activeConversationStorageKey, persistSeenJobs]);

  const persistGenerating = useCallback((ids: string[]) => {
    if (user?.id) writeGeneratingIds(user.id, ids);
    return ids;
  }, [user?.id]);

  const beginGeneration = useCallback((id: string) => {
    setGeneratingIds((current) => persistGenerating(current.includes(id) ? current : [...current, id]));
    setUnreadIds((current) => current.filter((item) => item !== id));
  }, [persistGenerating]);

  const finishGeneration = useCallback((id: string, markUnread: boolean) => {
    setGeneratingIds((current) => persistGenerating(current.filter((item) => item !== id)));
    if (user?.id) removePendingChat(user.id, id);
    if (markUnread) setUnreadIds((current) => current.includes(id) ? current : [...current, id]);
  }, [persistGenerating, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const stored = readGeneratingIds(user.id);
    const pending = readPendingChats(user.id);
    seenJobIdsRef.current = readSeenJobIds(user.id);
    appliedJobIdsRef.current = readAppliedJobIds(user.id);
    if (stored.length) setGeneratingIds(stored);
    if (pending.length) {
      setConversations((current) => mergePendingChats(current, pending, stored));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!ready || !user?.id || !workspaceEnabled) return;
    let active = true;
    const applyJobs = (jobs: PublicGenerationJob[]) => {
      const creating = jobs.filter((job) => job.status === "creating");
      setBusySurfaces([...new Set(creating.map((job) => job.surface))]);
      const chatCreating = creating.filter((job) => job.kind === "chat" && job.conversationId).map((job) => job.conversationId as string);
      const creatingIds = new Set(chatCreating);
      setGeneratingIds((current) => {
        const next = new Set(chatCreating);
        for (const id of current) {
          if (creatingIds.has(id)) {
            next.add(id);
            continue;
          }
          const mine = jobs.filter((job) => job.kind === "chat" && job.conversationId === id);
          if (mine.some((job) => job.status === "creating")) {
            next.add(id);
            continue;
          }
          const startedAt = user?.id ? generatingStartedAt(user.id, id) : 0;
          const thisRequestDone = mine.some((job) => (
            (job.status === "ready" || job.status === "failed")
            && Date.parse(job.createdAt) >= startedAt - 2000
          ));
          if (!thisRequestDone) next.add(id);
        }
        return persistGenerating([...next]);
      });
      if (user?.id && chatCreating.length) {
        const pending = readPendingChats(user.id);
        setConversations((items) => {
          const withPending = mergePendingChats(items, pending, chatCreating);
          const missing = creating.filter((job) => job.kind === "chat" && job.conversationId && !withPending.some((item) => item.id === job.conversationId));
          if (!missing.length) return withPending;
          return [
            ...missing.map((job) => {
              const local = pending.find((item) => item.id === job.conversationId);
              return local ?? {
                id: job.conversationId as string,
                title: job.title?.trim() || "Chat",
                updatedAt: job.createdAt,
                modelId: job.modelLabel ?? null,
                providerId: null,
                depthId: null,
                agentId: null,
                messages: [] as Conversation["messages"],
              };
            }),
            ...withPending,
          ];
        });
      }
      for (const job of jobs) {
        if (job.kind !== "chat" || job.status !== "ready" || !job.conversationId) continue;
        rememberConversationJob(job.conversationId, job.id);
        rememberSurfaceJob("chat", job.id);
        if (appliedJobIdsRef.current.has(job.id)) continue;
        const message = job.result?.message as ChatMessage | undefined;
        if (!message?.id) continue;
        persistAppliedJobs(job.id);
        const userMessage = job.result?.userMessage as ChatMessage | undefined;
        const route = job.result?.route as { providerId?: string; modelId?: string; depth?: string } | undefined;
        const selection = job.result?.selection as { providerId?: string | null; modelId?: string | null; depth?: string | null } | undefined;
        setConversations((items) => {
          const existing = items.find((conversation) => conversation.id === job.conversationId);
          if (!existing) {
            const messages = [userMessage, message].filter((item): item is ChatMessage => Boolean(item?.id));
            const restored: Conversation = {
              id: job.conversationId as string,
              title: job.title?.trim() || message.content.replace(/\s+/g, " ").trim().slice(0, 80) || "Chat",
              updatedAt: new Date().toISOString(),
              modelId: selection ? selection.modelId ?? null : route?.modelId ?? null,
              providerId: selection ? selection.providerId ?? null : route?.providerId ?? null,
              depthId: selection?.depth ?? route?.depth ?? null,
              agentId: null,
              messages,
            };
            return [restored, ...items];
          }
          if (existing.messages.some((item) => item.id === message.id)) return items;
          if (existing.messages.some((item) => item.role === "assistant" && item.content === message.content)) return items;
          return items.map((conversation) => {
            if (conversation.id !== job.conversationId) return conversation;
            const withUser = userMessage && !conversation.messages.some((item) => item.id === userMessage.id)
              ? [...conversation.messages, userMessage]
              : conversation.messages;
            return { ...conversation, updatedAt: new Date().toISOString(), messages: [...withUser, message] };
          });
        });
        if (creatingIds.has(job.conversationId)) continue;
        const startedAt = user?.id ? generatingStartedAt(user.id, job.conversationId) : 0;
        const alreadySeen = seenJobIdsRef.current.has(job.id);
        if (!startedAt || Date.parse(job.createdAt) < startedAt - 2000 || alreadySeen) {
          persistSeenJobs([job.id]);
          finishGeneration(job.conversationId, false);
          continue;
        }
        const away = currentSurfaceRef.current !== "chat" || activeConversationIdRef.current !== job.conversationId;
        if (!away) persistSeenJobs([job.id]);
        if (away) setUnreadSurfaces((current) => current.includes("chat") ? current : [...current, "chat"]);
        finishGeneration(job.conversationId, away);
      }
      for (const job of jobs) {
        if (job.status !== "ready" || job.kind === "chat") continue;
        rememberSurfaceJob(job.surface, job.id);
        if (seenJobIdsRef.current.has(job.id)) continue;
        if (!creatingJobIdsRef.current.has(job.id)) {
          persistSeenJobs([job.id]);
          continue;
        }
        if (job.surface !== currentSurfaceRef.current) {
          setUnreadSurfaces((current) => current.includes(job.surface) ? current : [...current, job.surface]);
        } else {
          persistSeenJobs([job.id]);
        }
      }
      creatingJobIdsRef.current = new Set(creating.map((job) => job.id));
    };
    const load = async () => {
      const response = await fetch("/api/generation-jobs", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || !active) return;
      const data = await response.json() as { jobs?: PublicGenerationJob[] };
      if (!active) return;
      applyJobs(data.jobs ?? []);
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [finishGeneration, persistAppliedJobs, persistGenerating, persistSeenJobs, ready, user?.id, workspaceEnabled]);

  const startNewChat = useCallback((options?: { keepAgent?: boolean }) => {
    explicitNewChatRef.current = true;
    sessionStorage.setItem(activeConversationStorageKey, "__new__");
    setActiveConversationIdState(null);
    if (!options?.keepAgent) setActiveAgentId(null);
  }, [activeConversationStorageKey]);

  const renameConversation = useCallback((id: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setConversations((items) => items.map((item) => item.id === id ? { ...item, title: nextTitle } : item));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    if (userEmail) markConversationUsageDeleted(userEmail, id);
    if (user?.id) removePendingChat(user.id, id);
    void fetch(`/api/workspace?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
    setGeneratingIds((current) => persistGenerating(current.filter((item) => item !== id)));
    setUnreadIds((current) => current.filter((item) => item !== id));
    setConversations((items) => items.filter((item) => item.id !== id));
    setActiveConversationIdState((active) => {
      if (active !== id) return active;
      sessionStorage.setItem(activeConversationStorageKey, "__new__");
      return null;
    });
  }, [activeConversationStorageKey, persistGenerating, user?.id, userEmail]);

  const value = useMemo(
    () => ({
      conversations,
      setConversations,
      activeConversationId,
      setActiveConversationId,
      activeAgentId,
      setActiveAgentId,
      visibleConversations,
      loading: workspaceLoading,
      generatingIds,
      unreadIds,
      busySurfaces,
      unreadSurfaces,
      beginGeneration,
      finishGeneration,
      startNewChat,
      renameConversation,
      deleteConversation,
    }),
    [
      activeAgentId,
      activeConversationId,
      beginGeneration,
      conversations,
      finishGeneration,
      busySurfaces,
      unreadSurfaces,
      generatingIds,
      setActiveConversationId,
      startNewChat,
      renameConversation,
      deleteConversation,
      unreadIds,
      visibleConversations,
      workspaceLoading,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
