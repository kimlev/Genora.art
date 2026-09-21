"use client";

import { closeAgentBuilder, openAgentBuilder } from "@/components/agents/agent-builder-dialog";
import { formatCompactTokens, useAuth } from "@/components/providers/auth-provider";
import { useBattleHistory } from "@/components/providers/battle-history-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useImageHistory } from "@/components/providers/image-history-provider";
import { ConfirmActionDialog } from "@/components/layout/confirm-action-dialog";
import { RenameTitleDialog } from "@/components/layout/rename-title-dialog";
import { WelcomeBonusCard } from "@/components/layout/welcome-bonus-card";
import {
  preloadAuthenticatedSurface,
  type PreloadableAuthenticatedSurface,
} from "@/components/layout/authenticated-surface-loader";
import { SpendEstimateDialog } from "@/components/profile/spend-estimate-dialog";
import { openTopUp } from "@/components/profile/top-up-dialog";
import { Button } from "@/components/ui/button";
import { agentLaunchHref } from "@/lib/agent-context";
import type { AgentCategory } from "@/lib/mock/agent-types";
import { CreditGlyph, withCreditGlyphs } from "@/components/ui/credit-glyph";
import type { Locale } from "@/lib/i18n";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import {
  DEFAULT_REGISTRATION_BONUS_THOUSANDS,
  parseRegistrationBonusThousands,
  registrationBonusTokensFromThousands,
} from "@/lib/site-settings";
import { CREATE_FOTO_VIDEO_PATH, isImageStudioPath } from "@/lib/routes";
import { IS_STAGING } from "@/lib/site-env";
import { useCustomAgents } from "@/lib/custom-agents";
import { cn } from "@/lib/utils";
import { BarChart3, ChevronDown, ChevronRight, Clapperboard, ImageIcon, Images, MessageSquare, Music, Pencil, Plus, Sparkles, Swords, Trash2, Wallet } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useLocalePrefetch, useLocalePush, useLocaleRouter } from "@/lib/i18n/use-locale-push";
import type { BattleSession } from "@/lib/battle-history";
import { useEffect, useState } from "react";

type WorkspaceSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

type Surface = "chat" | "images" | "audio" | "gallery" | "agents" | "battle" | "rating";
type SurfaceHref = "/chat" | "/create-foto-video" | "/battle" | "/agents" | "/rating" | "/image-examples" | "/video-examples" | "/pricing" | "/music" | "/songs" | "/gallery" | "/models#group-audio";
type RenameTarget = { kind: "chat" | "battle"; id: string; title: string } | null;
type DeleteTarget =
  | { kind: "chat" | "battle"; id: string }
  | { kind: "agent"; id: string; name: string }
  | null;

const SECTION_ORDER: Surface[] = ["chat", "images", "audio", "gallery", "agents", "battle", "rating"];
const EXPANDABLE = new Set<Surface>(["chat", "images", "audio", "agents", "battle"]);
const AUTH_TOGGLE_ONLY = new Set<Surface>(["chat", "images", "battle"]);

function preloadableSurfaceForHref(href: SurfaceHref): PreloadableAuthenticatedSurface | null {
  if (href === CREATE_FOTO_VIDEO_PATH) return "images";
  if (href === "/music") return "music";
  return null;
}

function isPersistentSurfaceHref(href: SurfaceHref): boolean {
  return href === "/chat"
    || href === CREATE_FOTO_VIDEO_PATH
    || href === "/image-examples"
    || href === "/video-examples"
    || href === "/music"
    || href === "/battle"
    || href === "/agents"
    || href === "/rating";
}

function surfaceFromPath(pathname: string): Surface {
  if (pathname.startsWith("/gallery")) return "gallery";
  if (isImageStudioPath(pathname) || pathname.startsWith("/image-examples") || pathname.startsWith("/video-examples")) return "images";
  if (pathname.startsWith("/agents")) return "agents";
  if (pathname.startsWith("/battle")) return "battle";
  if (pathname.startsWith("/music") || pathname.startsWith("/songs")) return "audio";
  if (pathname.startsWith("/rating")) return "rating";
  return "chat";
}

function SurfaceLamp({ unread }: { unread: boolean }) {
  if (!unread) return null;
  return <span className="size-2 shrink-0 rounded-full bg-blue-500" aria-hidden />;
}

function rowClass(active: boolean, size: "section" | "item" = "item") {
  return cn(
    "group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
    size === "section" ? "text-[13px]" : "text-[11.5px]",
    active ? "bg-sidebar-accent text-text" : "text-text hover:bg-sidebar-accent/60",
    active && "before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-accent-brand",
  );
}

function SidebarListItem({
  active,
  onOpen,
  title,
  renameLabel,
  deleteLabel,
  onRename,
  onDelete,
  marker = "idle",
}: {
  active: boolean;
  onOpen: () => void;
  title: string;
  renameLabel?: string;
  deleteLabel?: string;
  onRename?: () => void;
  onDelete?: () => void;
  marker?: "idle" | "unread";
}) {
  return (
    <li>
      <div className={rowClass(active)}>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {marker === "unread" ? (
            <SurfaceLamp unread />
          ) : (
            <span className="w-2 shrink-0 text-center text-xs leading-none text-steel" aria-hidden>–</span>
          )}
          <span className="min-w-0 truncate">{title}</span>
        </button>
        {onRename || onDelete ? (
          <span className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {onRename ? <button type="button" aria-label={renameLabel} onClick={onRename} className="rounded p-1 text-steel hover:bg-mist hover:text-text"><Pencil className="size-3.5" /></button> : null}
            {onDelete ? <button type="button" aria-label={deleteLabel} onClick={onDelete} className="rounded p-1 text-steel hover:bg-mist hover:text-destructive"><Trash2 className="size-3.5" /></button> : null}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ChatHistoryList({ conversations, activeId, unreadIds, locale, user, onOpen, onRename, onDelete }: {
  conversations: Array<{ id: string; title: string }>;
  activeId: string | null;
  unreadIds: string[];
  locale: Locale;
  user: unknown;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const copy = chatUiCopy(locale);
  if (!conversations.length) return null;
  return (
    <ul className="space-y-0.5">
      {conversations.map((conversation) => (
        <SidebarListItem
          key={conversation.id}
          active={conversation.id === activeId}
          onOpen={() => onOpen(conversation.id)}
          title={conversation.title}
          renameLabel={copy.renameChatAria}
          deleteLabel={copy.deleteChatAria}
          onRename={user ? () => onRename(conversation.id, conversation.title) : undefined}
          onDelete={user ? () => onDelete(conversation.id) : undefined}
          marker={unreadIds.includes(conversation.id) ? "unread" : "idle"}
        />
      ))}
    </ul>
  );
}

function BattleHistoryList({ sessions, activeId, locale, onOpen, onRename, onDelete }: {
  sessions: BattleSession[];
  activeId: string | null;
  locale: Locale;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const copy = chatUiCopy(locale);
  if (!sessions.length) return null;
  return (
    <ul className="space-y-0.5">
      {sessions.map((session) => (
        <SidebarListItem
          key={session.id}
          active={session.id === activeId}
          onOpen={() => onOpen(session.id)}
          title={session.title}
          renameLabel={copy.renameBattleAria}
          deleteLabel={copy.deleteBattleAria}
          onRename={() => onRename(session.id, session.title)}
          onDelete={() => onDelete(session.id)}
        />
      ))}
    </ul>
  );
}

export function WorkspaceSidebar({ onNavigate, className }: WorkspaceSidebarProps) {
  const t = useT();
  const { locale } = useLocale();
  const copy = chatUiCopy(locale);
  const router = useLocaleRouter();
  const pushLocale = useLocalePush();
  const prefetchLocale = useLocalePrefetch();
  const pathname = useAppPathname();
  const { user, ready: authReady, signOut } = useAuth();
  const { customAgents, deleteCustomAgent } = useCustomAgents();
  const {
    visibleConversations,
    loading: workspaceLoading,
    unreadIds,
    unreadSurfaces,
    activeConversationId,
    setActiveConversationId,
    setActiveAgentId,
    startNewChat,
    renameConversation,
    deleteConversation,
  } = useWorkspace();
  const { sessions: battleSessions, activeSessionId, setActiveSessionId, startNewBattle, renameSession: renameBattleSession, deleteSession: deleteBattleSession } = useBattleHistory();
  const { startNewConversation: startNewImageConversation } = useImageHistory();
  const [rename, setRename] = useState<RenameTarget>(null);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget>(null);
  const [openSections, setOpenSections] = useState<Surface[]>(() => [surfaceFromPath(pathname)]);

  const active = surfaceFromPath(pathname);
  const destGuest = IS_STAGING && !user;
  const sectionMeta: Record<Surface, { label: string; icon: typeof MessageSquare }> = {
    chat: { label: t.workspace.menuChats, icon: MessageSquare },
    images: { label: t.workspace.menuImages, icon: ImageIcon },
    audio: { label: t.workspace.menuAudio, icon: Music },
    gallery: { label: t.workspace.menuGallery, icon: Images },
    agents: { label: t.workspace.menuAgents, icon: Sparkles },
    battle: { label: t.workspace.menuBattle, icon: Swords },
    rating: { label: destGuest ? t.workspace.menuRating : t.workspace.menuMyRating, icon: BarChart3 },
  };

  useEffect(() => {
    setOpenSections((current) => current.includes(active) ? current : [...current, active]);
  }, [active]);

  const hrefForSurface = (item: Surface): SurfaceHref => {
    if (item === "chat") return "/chat";
    if (item === "images") return CREATE_FOTO_VIDEO_PATH;
    if (item === "audio") return user ? "/music" : "/songs";
    if (item === "gallery") return "/gallery";
    if (item === "agents") return "/agents";
    if (item === "battle") return "/battle";
    return "/rating";
  };

  const openSurface = (href: SurfaceHref) => {
    if (pathname !== href) {
      const preloadableSurface = preloadableSurfaceForHref(href);
      if (preloadableSurface) void preloadAuthenticatedSurface(preloadableSurface);
      pushLocale(href);
    }
    onNavigate?.();
  };

  const prepareSurface = (href: SurfaceHref) => {
    if (!user || !isPersistentSurfaceHref(href)) prefetchLocale(href);
    const preloadableSurface = preloadableSurfaceForHref(href);
    if (preloadableSurface) void preloadAuthenticatedSurface(preloadableSurface);
  };

  const toggleSection = (item: Surface) => {
    if (item === "agents") closeAgentBuilder();
    const toggleExpanded = () => setOpenSections((current) => (
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item]
    ));
    if (user && AUTH_TOGGLE_ONLY.has(item)) {
      toggleExpanded();
      return;
    }
    if (user && item === "agents") {
      if (active === "agents") toggleExpanded();
      else {
        setOpenSections((current) => current.includes("agents") ? current : [...current, "agents"]);
        openSurface("/agents");
      }
      return;
    }
    if (item === "chat" && !pathname.startsWith("/chat")) {
      if (!user) startNewChat();
      openSurface("/chat");
      setOpenSections((current) => current.includes("chat") ? current : [...current, "chat"]);
      return;
    }
    if (item === "images" && !isImageStudioPath(pathname)) {
      openSurface(CREATE_FOTO_VIDEO_PATH);
      setOpenSections((current) => current.includes("images") ? current : [...current, "images"]);
      return;
    }
    if (item === "audio" && user && !pathname.startsWith("/music")) {
      openSurface("/music");
      setOpenSections((current) => current.includes("audio") ? current : [...current, "audio"]);
      return;
    }
    if (EXPANDABLE.has(item) && active === item) {
      toggleExpanded();
      return;
    }
    if (active !== item) openSurface(hrefForSurface(item));
  };

  const openConversation = (id: string) => {
    setActiveConversationId(id);
    onNavigate?.();
    if (!pathname.startsWith("/chat")) openSurface("/chat");
  };

  const createChat = () => {
    startNewChat();
    onNavigate?.();
    if (!pathname.startsWith("/chat")) openSurface("/chat");
  };

  const openBattle = (id: string) => { setActiveSessionId(id); onNavigate?.(); if (!pathname.startsWith("/battle")) openSurface("/battle"); };
  const createBattle = () => { startNewBattle(); onNavigate?.(); if (!pathname.startsWith("/battle")) openSurface("/battle"); };
  const createImage = () => {
    if (user) startNewImageConversation();
    onNavigate?.();
    if (!isImageStudioPath(pathname)) openSurface(CREATE_FOTO_VIDEO_PATH);
  };
  const createAgent = () => {
    if (!authReady) return;
    if (!user) {
      onNavigate?.();
      router.push("/register");
      return;
    }
    openAgentBuilder();
    if (!pathname.startsWith("/agents")) pushLocale("/agents?create=1");
  };
  const useAgent = (id: string, context: AgentCategory) => {
    setActiveAgentId(id);
    if (context !== "images" && context !== "video") startNewChat({ keepAgent: true });
    onNavigate?.();
    pushLocale(agentLaunchHref(id, context));
  };

  const saveRename = (title: string) => {
    if (!rename) return;
    if (rename.kind === "chat") renameConversation(rename.id, title);
    if (rename.kind === "battle") void renameBattleSession(rename.id, title);
    setRename(null);
  };

  const logout = () => {
    signOut();
    onNavigate?.();
    router.replace("/");
  };

  const sectionBody = (item: Surface) => {
    if (!authReady) return <SidebarLoading />;
    if (item === "chat") {
      if (!user) return null;
      if (workspaceLoading) return <SidebarLoading />;
      if (visibleConversations.length === 0) return <p className="px-3 py-2 text-xs leading-relaxed text-steel">{t.workspace.emptyChats}</p>;
      return (
        <ChatHistoryList
          conversations={visibleConversations}
          activeId={active === "chat" ? activeConversationId : null}
          unreadIds={unreadIds}
          locale={locale}
          user={user}
          onOpen={openConversation}
          onRename={(id, title) => setRename({ kind: "chat", id, title })}
          onDelete={(id) => setPendingDelete({ kind: "chat", id })}
        />
      );
    }
    if (item === "images" || item === "audio") return null;
    if (item === "agents") {
      if (!customAgents.length) return <p className="px-3 py-2 text-xs leading-relaxed text-steel">{t.workspace.customAgentsEmpty}</p>;
      return (
        <ul className="space-y-0.5">
          {customAgents.map((agent) => (
            <SidebarListItem
              key={agent.id}
              active={false}
              onOpen={() => useAgent(agent.id, agent.context)}
              title={agent.name}
              deleteLabel={t.workspace.deleteConfirm}
              onDelete={() => setPendingDelete({ kind: "agent", id: agent.id, name: agent.name })}
            />
          ))}
        </ul>
      );
    }
    if (item === "battle") {
      if (!battleSessions.length) return <p className="px-3 py-2 text-xs leading-relaxed text-steel">{t.workspace.battleHistoryEmpty}</p>;
      return (
        <BattleHistoryList
          sessions={battleSessions}
          activeId={activeSessionId}
          locale={locale}
          onOpen={openBattle}
          onRename={(id, title) => setRename({ kind: "battle", id, title })}
          onDelete={(id) => setPendingDelete({ kind: "battle", id })}
        />
      );
    }
    return null;
  };

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden border-e border-border bg-sidebar", className)}>
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-3">
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
          <div className="space-y-0.5 pb-3">
            {SECTION_ORDER.filter((item) => item !== "gallery" || Boolean(user)).map((item) => {
              const Icon = sectionMeta[item].icon;
              const expanded = EXPANDABLE.has(item) && openSections.includes(item);
              const Chevron = expanded ? ChevronDown : ChevronRight;
              const sectionUnread = (item === "chat" || item === "images" || item === "audio") && unreadSurfaces.includes(item);
              return (
                <div key={item}>
                  <button
                    type="button"
                    onClick={() => toggleSection(item)}
                    className={rowClass(active === item, "section")}
                  >
                    {EXPANDABLE.has(item) ? <Chevron className="size-3.5 shrink-0 text-steel" /> : <span className="size-3.5 shrink-0" />}
                    <Icon className="size-4 shrink-0 text-accent-brand" />
                    <span className="min-w-0 flex-1 truncate font-medium">{sectionMeta[item].label}</span>
                    {!expanded ? <SurfaceLamp unread={sectionUnread} /> : null}
                  </button>
                  {expanded ? (
                    <div className="ms-6 mt-0.5 space-y-0.5 border-s border-border/70 ps-2">
                      {item === "chat" ? (
                        <button type="button" onClick={createChat} className={rowClass(false)}>
                          <Plus className="size-3.5 shrink-0 text-accent-brand" />
                          {t.workspace.newChat}
                        </button>
                      ) : null}
                      {item === "images" ? (
                        <>
                          <button type="button" onPointerEnter={() => prepareSurface(CREATE_FOTO_VIDEO_PATH)} onFocus={() => prepareSurface(CREATE_FOTO_VIDEO_PATH)} onClick={createImage} className={rowClass(isImageStudioPath(pathname))}>
                            {sectionUnread ? <SurfaceLamp unread /> : <Plus className="size-3.5 shrink-0 text-accent-brand" />}
                            {t.workspace.menuPhotoCreate}
                          </button>
                          <button type="button" onPointerEnter={() => prepareSurface("/image-examples")} onFocus={() => prepareSurface("/image-examples")} onClick={() => openSurface("/image-examples")} className={rowClass(pathname.startsWith("/image-examples"))}>
                            <ImageIcon className="size-3.5 shrink-0 text-accent-brand" />
                            {t.workspace.menuPhotoTemplates}
                          </button>
                          <button type="button" onPointerEnter={() => prepareSurface("/video-examples")} onFocus={() => prepareSurface("/video-examples")} onClick={() => openSurface("/video-examples")} className={rowClass(pathname.startsWith("/video-examples"))}>
                            <Clapperboard className="size-3.5 shrink-0 text-accent-brand" />
                            {t.workspace.menuVideoTemplates}
                          </button>
                        </>
                      ) : null}
                      {item === "audio" ? (
                        <button type="button" onPointerEnter={() => prepareSurface("/music")} onFocus={() => prepareSurface("/music")} onClick={() => openSurface("/music")} className={rowClass(pathname.startsWith("/music"))}>
                          {sectionUnread ? <SurfaceLamp unread /> : <Plus className="size-3.5 shrink-0 text-accent-brand" />}
                          {t.workspace.menuMusicCreate}
                        </button>
                      ) : null}
                      {item === "agents" ? (
                        <button type="button" onClick={createAgent} className={rowClass(false)}>
                          <Plus className="size-3.5 shrink-0 text-accent-brand" />
                          {t.workspace.createAgent}
                        </button>
                      ) : null}
                      {item === "battle" ? (
                        <button type="button" onClick={createBattle} className={rowClass(false)}>
                          <Plus className="size-3.5 shrink-0 text-accent-brand" />
                          {t.workspace.newBattle}
                        </button>
                      ) : null}
                      {sectionBody(item)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div data-testid="workspace-account-footer" className={cn("relative border-t border-border p-3", user && "shrink-0")}>
        {!authReady ? <SidebarLoading compact /> : user ? (
          <div className="flex flex-col">
            <WelcomeBonusCard />
            <div className="rounded-xl bg-mist/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs text-steel">
                  <Wallet className="size-4 text-accent-brand" />
                  {t.workspace.balanceTitle}
                </span>
                <span className="text-sm font-semibold tabular-nums text-text">
                  {withCreditGlyphs(formatCompactTokens(user.balanceTokens, locale))}
                </span>
              </div>
              <Button type="button" size="sm" className="mt-2.5 w-full" onClick={openTopUp}>
                {t.workspace.topUp}
              </Button>
            </div>
            <button type="button" onClick={logout} className="mt-3 w-full text-center text-xs font-normal text-destructive transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40">
              {t.workspace.signOut}
            </button>
          </div>
        ) : (
          <GuestAuthCard />
        )}
      </div>
      {rename ? <RenameTitleDialog initial={rename.title} onClose={() => setRename(null)} onSave={saveRename} /> : null}
      {pendingDelete ? (
        <ConfirmActionDialog
          title={
            pendingDelete.kind === "agent"
              ? t.workspace.confirmDeleteAgent.replace("{name}", pendingDelete.name)
              : pendingDelete.kind === "battle"
                ? copy.confirmDeleteBattle
                : copy.confirmDeleteChat
          }
          cancelLabel={t.workspace.renameCancel}
          confirmLabel={t.workspace.deleteConfirm}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete.kind === "chat") deleteConversation(pendingDelete.id);
            else if (pendingDelete.kind === "battle") void deleteBattleSession(pendingDelete.id);
            else deleteCustomAgent(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}

function GuestAuthCard() {
  const t = useT();
  const [thousands, setThousands] = useState(DEFAULT_REGISTRATION_BONUS_THOUSANDS);
  const [spendOpen, setSpendOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { registrationBonusThousands?: unknown } | null) => {
        const parsed = parseRegistrationBonusThousands(data?.registrationBonusThousands);
        if (active && parsed !== null) setThousands(parsed);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-xl bg-mist/70 p-3">
      <div className="rounded-lg bg-accent-brand/10 px-3 py-2.5">
        <p className="text-xs font-medium text-emerald-800">{t.workspace.registrationBonusTitle}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-sky-500">
          {thousands}{"\u00a0"}<CreditGlyph />
        </p>
        <button type="button" onClick={() => setSpendOpen(true)} className="mt-1 text-left text-xs font-medium text-accent-brand underline underline-offset-2 transition-opacity hover:opacity-80">
          {t.workspace.registrationBonusSpendHint}
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <Button nativeButton={false} size="sm" render={<Link href="/register" target="_blank" rel="noopener" />}>
          {t.workspace.signUp}
        </Button>
        <Button nativeButton={false} size="sm" variant="outline" render={<Link href="/login" target="_blank" rel="noopener" />}>
          {t.workspace.signIn}
        </Button>
      </div>
      {spendOpen ? <SpendEstimateDialog tokens={registrationBonusTokensFromThousands(thousands)} onClose={() => setSpendOpen(false)} /> : null}
    </div>
  );
}

function SidebarLoading({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  return <div className={cn("animate-pulse rounded-xl bg-mist/70", compact ? "h-24" : "mx-2 mt-3 h-16")} aria-label={chatUiCopy(locale).loading} />;
}
