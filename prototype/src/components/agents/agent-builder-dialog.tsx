"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_BUILDER_CONTEXTS, AGENT_DESCRIPTION_MAX, AGENT_NAME_MAX, toBuilderContext } from "@/lib/agent-context";
import { useCustomAgents } from "@/lib/custom-agents";
import { getLocaleOption } from "@/lib/i18n";
import type { AgentCategory } from "@/lib/mock/agent-types";
import { BadgeIcon, Bot, BrainCircuit, BriefcaseBusiness, Check, ChevronDown, Code2, CreditCard, Database, ImageIcon, Languages, Layers3, Megaphone, Palette, PenLine, ScanLine, Search, ShieldCheck, Sparkles, UserRound, UsersRound, WandSparkles, X, type LucideIcon } from "lucide-react";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { acquireScrollLock } from "@/lib/scroll-lock";

export const AGENT_BUILDER_EVENT = "genora-open-agent-builder";
export const AGENT_BUILDER_CLOSE_EVENT = "genora-close-agent-builder";
export const AGENT_SAVED_EVENT = "genora-agent-saved";

export type AgentDraft = {
  id?: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  context: AgentCategory;
};

export const agentIconMap: Record<string, LucideIcon> = {
  bot: Bot,
  brain: BrainCircuit,
  code: Code2,
  database: Database,
  pen: PenLine,
  search: Search,
  megaphone: Megaphone,
  languages: Languages,
  sparkles: Sparkles,
  badge: BadgeIcon,
  "credit-card": CreditCard,
  palette: Palette,
  scan: ScanLine,
  "user-round": UserRound,
  "users-round": UsersRound,
  layers: Layers3,
  wand: WandSparkles,
  shield: ShieldCheck,
  "briefcase-business": BriefcaseBusiness,
  image: ImageIcon,
};

const emptyDraft: AgentDraft = { name: "", description: "", systemPrompt: "", icon: "bot", context: "writing" };

function stripCreateQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("create")) return;
  url.searchParams.delete("create");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function openAgentBuilder(draft?: Partial<AgentDraft>) {
  const next = { ...emptyDraft, ...draft };
  window.dispatchEvent(new CustomEvent<AgentDraft>(AGENT_BUILDER_EVENT, {
    detail: { ...next, context: toBuilderContext(next.context) },
  }));
}

/** Закрывает форму создания и убирает ?create=1, чтобы раздел «Агенты» снова вёл в каталог. */
export function closeAgentBuilder() {
  stripCreateQuery();
  window.dispatchEvent(new CustomEvent(AGENT_BUILDER_CLOSE_EVENT));
}

export function AgentBuilderDialog() {
  const t = useT();
  const { locale } = useLocale();
  const dir = getLocaleOption(locale).rtl ? "rtl" : "ltr";
  const { saveCustomAgent } = useCustomAgents();
  const { ready: authReady, user, setBalanceTokens } = useAuth();
  const router = useLocaleRouter();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const copy = t.agents;

  const userRef = useRef(user);
  const authReadyRef = useRef(authReady);
  const openedFromQuery = useRef(false);
  userRef.current = user;
  authReadyRef.current = authReady;

  const goRegister = () => {
    stripCreateQuery();
    router.push("/register");
  };

  const dismissBuilder = () => {
    stripCreateQuery();
    setDraft(null);
  };

  useEffect(() => {
    setMounted(true);
    const open = (event: Event) => {
      if (!authReadyRef.current) return;
      if (!userRef.current) {
        goRegister();
        return;
      }
      const detail = "detail" in event ? (event as CustomEvent<AgentDraft>).detail : undefined;
      setHelpError(null);
      setHelpBusy(false);
      const next = detail ? { ...emptyDraft, ...detail } : { ...emptyDraft };
      setDraft({ ...next, context: toBuilderContext(next.context) });
    };
    const close = () => setDraft(null);
    window.addEventListener(AGENT_BUILDER_EVENT, open);
    window.addEventListener(AGENT_BUILDER_CLOSE_EVENT, close);
    return () => {
      window.removeEventListener(AGENT_BUILDER_EVENT, open);
      window.removeEventListener(AGENT_BUILDER_CLOSE_EVENT, close);
    };
  }, [router]);

  useEffect(() => {
    if (!authReady || openedFromQuery.current) return;
    if (new URLSearchParams(window.location.search).get("create") !== "1") return;
    openedFromQuery.current = true;
    if (!user) {
      goRegister();
      return;
    }
    setDraft({ ...emptyDraft });
  }, [authReady, user, router]);

  useEffect(() => {
    if (!draft) return;
    return acquireScrollLock();
  }, [draft]);

  const contextLabel = (context: AgentCategory) => ({
    images: copy.contextImages,
    video: copy.contextVideo,
    code: copy.contextCode,
    writing: copy.contextText,
    analysis: copy.contextAnalysis,
    marketing: copy.contextMarketing,
    song: copy.contextSong,
  }[context]);

  const generatePrompt = async () => {
    if (!user) {
      goRegister();
      return;
    }
    if (!draft || helpBusy) return;
    setHelpBusy(true);
    setHelpError(null);
    try {
      const response = await fetch("/api/agents/prompt-help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          context: draft.context,
          description: draft.description.trim() || draft.name.trim() || copy.builderDescriptionPlaceholder,
          locale,
        }),
      });
      const data = await response.json().catch(() => null) as { prompt?: string; balanceTokens?: number; error?: string } | null;
      if (typeof data?.balanceTokens === "number") setBalanceTokens(data.balanceTokens);
      if (!response.ok || !data?.prompt) {
        setHelpError(data?.error ?? copy.builderAiHelpError);
        return;
      }
      setDraft((current) => current ? { ...current, systemPrompt: data.prompt ?? current.systemPrompt } : current);
    } catch {
      setHelpError(copy.builderAiHelpError);
    } finally {
      setHelpBusy(false);
    }
  };

  const submitAgent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      goRegister();
      return;
    }
    if (!draft?.name.trim() || !draft.description.trim() || !draft.systemPrompt.trim()) return;
    const saved = saveCustomAgent({
      id: draft.id,
      name: draft.name.trim().slice(0, 40),
      description: draft.description.trim(),
      systemPrompt: draft.systemPrompt.trim(),
      icon: draft.icon,
      modelId: "gpt-5.6-sol",
      context: draft.context,
    });
    window.dispatchEvent(new CustomEvent(AGENT_SAVED_EVENT, { detail: { id: saved.id, context: saved.context } }));
    dismissBuilder();
  };

  if (!mounted || !draft) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={draft.id ? copy.builderEdit : copy.builderNew}
      dir={dir}
    >
      <form
        onSubmit={submitAgent}
        data-lenis-prevent
        dir={dir}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-text">{draft.id ? copy.builderEdit : copy.builderNew}</h2>
            <p className="mt-1 text-sm text-steel">{copy.builderSubtitle}</p>
          </div>
          <button type="button" aria-label={copy.builderClose} onClick={dismissBuilder} className="rounded-xl p-2 text-steel hover:bg-mist">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain px-5 py-6 sm:px-7">
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label>
                {copy.builderIcon} <span className="font-normal text-steel">{copy.builderOptional}</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(agentIconMap).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: key })}
                    className={`grid size-10 place-items-center rounded-xl border ${draft.icon === key ? "border-accent-brand bg-mist text-accent-brand" : "border-border text-steel hover:text-text"}`}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <Label htmlFor="agent-name">{copy.builderName}</Label>
              <Label id="agent-context-label">{copy.builderContext}</Label>
              <div className="relative">
                <Input
                  id="agent-name"
                  dir="auto"
                  maxLength={AGENT_NAME_MAX}
                  required
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value.slice(0, AGENT_NAME_MAX) })}
                  placeholder={copy.builderNamePlaceholder}
                  className="h-11 pe-14"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-steel">
                  {draft.name.length}/{AGENT_NAME_MAX}
                </span>
              </div>
              <Menu
                ariaLabel={copy.builderContext}
                triggerClassName="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist"
                panelClassName="z-[120] w-64"
                trigger={<>
                  <span className="min-w-0 flex-1 truncate text-left">{contextLabel(draft.context)}</span>
                  <ChevronDown className="size-4 shrink-0 text-steel" />
                </>}
              >
                {(close) => <>
                  {AGENT_BUILDER_CONTEXTS.map((context) => (
                    <MenuItem key={context} active={draft.context === context} onClick={() => { setDraft({ ...draft, context }); close(); }}>
                      <span className="min-w-0 flex-1 truncate">{contextLabel(context)}</span>
                      {draft.context === context ? <Check className="size-4 text-accent-brand" /> : null}
                    </MenuItem>
                  ))}
                </>}
              </Menu>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="agent-description">{copy.builderDescription}</Label>
                <span className="text-xs tabular-nums text-steel">{draft.description.length}/{AGENT_DESCRIPTION_MAX}</span>
              </div>
              <Textarea
                id="agent-description"
                dir="auto"
                maxLength={AGENT_DESCRIPTION_MAX}
                required
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder={copy.builderDescriptionPlaceholder}
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <Label htmlFor="agent-prompt" className="pt-1.5">{copy.builderSystem}</Label>
                <div className="flex w-fit flex-col items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-accent-brand/45 bg-accent-brand/10 text-accent-brand hover:border-accent-brand hover:bg-accent-brand hover:text-white dark:hover:text-white"
                    disabled={helpBusy}
                    onClick={() => void generatePrompt()}
                  >
                    <Sparkles className="size-3.5" />{helpBusy ? copy.builderAiHelpBusy : copy.builderAiHelp}
                  </Button>
                  <p className="mt-1 w-full text-center text-[10px] leading-tight text-red-500">{copy.builderAiHelpCost}</p>
                </div>
              </div>
              <Textarea
                id="agent-prompt"
                dir="auto"
                required
                value={draft.systemPrompt}
                onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
                placeholder={copy.builderSystemPlaceholder}
                className="min-h-40"
              />
              <p className="text-xs text-steel">{copy.builderAiHelpHint}</p>
              {helpError ? <p className="text-xs text-destructive">{helpError}</p> : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-surface px-5 py-4 sm:px-7">
          <Button type="button" variant="outline" onClick={dismissBuilder}>{copy.builderCancel}</Button>
          <Button type="submit">{copy.builderSave}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
