"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import type { BattleSession, BattleSide } from "@/lib/battle-history";
import { studioBattleCopy } from "@/lib/i18n/copy/studio-battle";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type BattleHistoryContextValue = {
  sessions: BattleSession[];
  activeSessionId: string | null;
  loaded: boolean;
  setActiveSessionId: (id: string | null) => void;
  startNewBattle: () => void;
  refresh: (preferredId?: string | null) => Promise<void>;
  setPreferred: (roundId: string, side: BattleSide) => void;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
};

const BattleHistoryContext = createContext<BattleHistoryContextValue | null>(null);

export function BattleHistoryProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const pathname = useAppPathname();
  const { locale } = useLocale();
  const copy = studioBattleCopy(locale);
  const [sessions, setSessions] = useState<BattleSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (preferredId?: string | null) => {
    const response = await fetch("/api/battles", { cache: "no-store" });
    if (!response.ok) throw new Error(copy.historyLoadFailed);
    const payload = await response.json() as { sessions?: BattleSession[] };
    const next = payload.sessions ?? [];
    setSessions(next);
    setActiveSessionId((current) => {
      const wanted = preferredId === undefined ? current : preferredId;
      return wanted && next.some((item) => item.id === wanted) ? wanted : next[0]?.id ?? null;
    });
    setLoaded(true);
  }, [copy]);

  useEffect(() => {
    if (!ready || !pathname.startsWith("/battle")) return;
    if (!userId) {
      const timer=window.setTimeout(()=>{setSessions([]);setActiveSessionId(null);setLoaded(true);},0);
      return ()=>window.clearTimeout(timer);
    }
    const timer=window.setTimeout(()=>{void refresh().catch(() => {
      setSessions([]);setActiveSessionId(null);setLoaded(true);
    });},0);
    return ()=>window.clearTimeout(timer);
  }, [pathname, ready, refresh, userId]);

  const startNewBattle = useCallback(() => setActiveSessionId(null), []);

  const setPreferred = useCallback((roundId: string, side: BattleSide) => {
    setSessions((current) => current.map((session) => ({
      ...session,
      rounds: session.rounds.map((round) => round.id === roundId ? { ...round, preferred: side } : round),
    })));
  }, []);

  const renameSession = useCallback(async (id: string, title: string) => {
    const response = await fetch("/api/battles", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: id, title }),
    });
    if (!response.ok) throw new Error(copy.renameBattleFailed);
    setSessions((current) => current.map((session) => session.id === id ? { ...session, title } : session));
  }, [copy]);

  const deleteSession = useCallback(async (id: string) => {
    const response = await fetch(`/api/battles?sessionId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(copy.deleteBattleFailed);
    setSessions((current) => {
      const next = current.filter((session) => session.id !== id);
      setActiveSessionId((active) => active === id ? next[0]?.id ?? null : active);
      return next;
    });
  }, [copy]);

  const value = useMemo(() => ({ sessions, activeSessionId, loaded, setActiveSessionId, startNewBattle, refresh, setPreferred, renameSession, deleteSession }),
    [activeSessionId, deleteSession, loaded, refresh, renameSession, sessions, setPreferred, startNewBattle]);

  return <BattleHistoryContext.Provider value={value}>{children}</BattleHistoryContext.Provider>;
}

export function useBattleHistory(): BattleHistoryContextValue {
  const context = useContext(BattleHistoryContext);
  if (!context) throw new Error("useBattleHistory must be used within BattleHistoryProvider");
  return context;
}
