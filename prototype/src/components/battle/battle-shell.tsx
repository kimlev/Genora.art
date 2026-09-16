"use client";
import { promptErrorMessage } from "@/lib/public-error";

import { AgentPicker, ClearAgentButton } from "@/components/chat/agent-picker";
import { ChatComposer, type ComposerAttachment, type ComposerDraft } from "@/components/chat/chat-composer";
import { DepthPicker } from "@/components/chat/depth-picker";
import { MarkdownMessage } from "@/components/chat/markdown-message";
import { ModelPicker } from "@/components/chat/model-picker";
import { ProviderPicker } from "@/components/chat/provider-picker";
import { ResponseActions } from "@/components/chat/response-actions";
import { useAuth } from "@/components/providers/auth-provider";
import { formatCompactTokens } from "@/components/providers/auth-provider";
import { useBattleHistory } from "@/components/providers/battle-history-provider";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import type { BattleAnswer, BattleDepth as Depth, BattleSide as Side, BattleSideSettings } from "@/lib/battle-history";
import type { CommercialModel } from "@/lib/catalog/commercial-models";
import { sortModelsByStrength } from "@/lib/catalog/model-rank";
import { stripDataUrlBase64 } from "@/lib/chat-attachments";
import { clampChatDepthForModel, isGemmaChatModel } from "@/lib/chat-request-policy";
import { studioBattleCopy } from "@/lib/i18n/copy/studio-battle";
import { integratorProviderId } from "@/lib/provider-id";
import {
  isPhotoPromptAgent,
  photoPromptDisplayContent,
  photoPromptRequestContent,
} from "@/lib/photo-prompt-agent";
import {
  isVideoPromptAgent,
  VIDEO_PROMPT_MODELS,
  VIDEO_PROMPT_PROVIDERS,
  videoPromptDepthForModel,
  videoPromptAlternateModel,
  videoPromptDefaultModel,
  videoPromptModelAllowed,
  videoPromptModelForProvider,
  videoPromptProviderForModel,
  videoPromptDisplayContent,
  videoPromptRequestContent,
} from "@/lib/video-prompt-agent";
import { formatThinkingTime } from "@/lib/thinking-time";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2, RotateCcw, Swords } from "lucide-react";
import { IS_STAGING } from "@/lib/site-env";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SideSettings = { provider: CommercialModel["provider"]; model: string; depth: Depth };

const pickerTrigger = "w-full min-w-0 max-w-full px-3 py-2 text-sm";

function SelectorGroup({
  value,
  onChange,
  label,
  models,
  align = "start",
  allowedProviders,
  allowedIds,
}: {
  value: SideSettings;
  onChange: (next: SideSettings) => void;
  label: string;
  models: CommercialModel[];
  align?: "start" | "end";
  allowedProviders?: string[];
  allowedIds?: string[];
}) {
  const modelsFor = (provider: CommercialModel["provider"]) => sortModelsByStrength(
    models.filter((model) => model.provider === provider && (!allowedIds?.length || allowedIds.includes(model.id))),
  );
  const showDepth = !isGemmaChatModel(value.model);
  return (
    <div className="min-w-0">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-steel">{label}</p>
      <div className={cn("grid min-w-0 gap-1", showDepth ? "grid-cols-3" : "grid-cols-2")}>
        <div className="min-w-0 [&>div]:w-full">
          <ProviderPicker
            value={value.provider}
            showLogos
            allowAuto={false}
            allowedProviders={allowedProviders}
            align={align}
            className={pickerTrigger}
            onChange={(provider) => {
              if (provider === "auto") return;
              const model = modelsFor(provider)[0]?.id
                ?? (allowedIds?.length ? videoPromptModelForProvider(provider, allowedIds) : value.model);
              onChange({ ...value, provider, model, depth: clampChatDepthForModel(model, value.depth) });
            }}
          />
        </div>
        <div className="min-w-0 [&>div]:w-full">
          <ModelPicker
            value={value.model}
            provider={value.provider}
            allowAuto={false}
            allowedIds={allowedIds}
            align={align}
            className={pickerTrigger}
            onChange={(model) => {
              if (model === "auto") return;
              onChange({ ...value, model, depth: clampChatDepthForModel(model, value.depth) });
            }}
          />
        </div>
        {showDepth ? <div className="min-w-0 [&>div]:w-full">
          <DepthPicker
            value={value.depth}
            allowAuto={false}
            align={align}
            className={pickerTrigger}
            modelId={value.model}
            onChange={(depth) => {
              if (depth === "auto") return;
              onChange({ ...value, depth });
            }}
          />
        </div> : null}
      </div>
    </div>
  );
}

export function BattleShell() {
  const t = useT();
  const { locale } = useLocale();
  const copy = studioBattleCopy(locale);
  const depthLabels: Record<Depth, string> = { fast: t.chat.depthFast, balanced: t.chat.depthBalanced, deep: t.chat.depthDeep };
  const { user, ready, setBalanceTokens } = useAuth();
  const router = useLocaleRouter();
  const { models, providers: catalogProviders, refresh: refreshCatalog } = useCatalog();
  const { sessions,activeSessionId,loaded,refresh,setPreferred }=useBattleHistory();
  const [left, setLeft] = useState<SideSettings>({ provider: "OpenAI", model: "gpt-5.6-sol", depth: "balanced" });
  const [right, setRight] = useState<SideSettings>({ provider: "Anthropic", model: "claude-opus-5", depth: "balanced" });
  const [agentId, setAgentId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<Side>("left");
  const [generating, setGenerating] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState<ComposerDraft | null>(null);
  const [copiedRoundId, setCopiedRoundId] = useState<string | null>(null);
  const attachmentsByRound = useRef<Record<string, ComposerAttachment[]>>({});
  const attachmentsByPrompt = useRef<Record<string, ComposerAttachment[]>>({});
  const pendingAttachments = useRef<ComposerAttachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeSession=useMemo(()=>sessions.find((session)=>session.id===activeSessionId)??null,[activeSessionId,sessions]);
  const rounds=useMemo(()=>activeSession?.rounds??[],[activeSession]);
  const videoPrompt = isVideoPromptAgent(agentId);
  const photoPrompt = isPhotoPromptAgent(agentId);
  const videoIds = useMemo(
    () => models.filter((model) => VIDEO_PROMPT_MODELS.includes(model.id as (typeof VIDEO_PROMPT_MODELS)[number])).map((model) => model.id),
    [models],
  );

  useEffect(() => {
    if (ready && !user && !IS_STAGING) router.replace("/login");
  }, [ready, router, user]);

  useEffect(()=>{
    if(!activeSession)return;
    const frame=window.requestAnimationFrame(()=>{
      let nextLeft = toUiSettings(activeSession.left, models);
      let nextRight = toUiSettings(activeSession.right, models);
      if (isVideoPromptAgent(activeSession.agentId)) {
        const available = models.filter((model) => VIDEO_PROMPT_MODELS.includes(model.id as (typeof VIDEO_PROMPT_MODELS)[number])).map((model) => model.id);
        const leftModel = videoPromptModelAllowed(nextLeft.model) ? nextLeft.model : videoPromptDefaultModel(available);
        const rightModel = videoPromptModelAllowed(nextRight.model) ? nextRight.model : videoPromptAlternateModel(leftModel, available);
        nextLeft = { provider: videoPromptProviderForModel(leftModel), model: leftModel, depth: clampChatDepthForModel(leftModel, nextLeft.depth) };
        nextRight = { provider: videoPromptProviderForModel(rightModel), model: rightModel, depth: clampChatDepthForModel(rightModel, nextRight.depth) };
      }
      setLeft(nextLeft);
      setRight(nextRight);
      setAgentId(activeSession.agentId);
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[activeSession,models]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [generating, rounds]);

  const send = useCallback(async (content: string, attachments: ComposerAttachment[]) => {
    if (!user) { router.push("/register"); return; }
    if (generating) return;
    setGenerating(true);
    setSendError(null);
    const displayContent = isVideoPromptAgent(agentId)
      ? videoPromptDisplayContent(content, locale)
      : isPhotoPromptAgent(agentId)
        ? photoPromptDisplayContent(content, locale)
        : (content || copy.attachmentPrompt);
    const requestContent = isVideoPromptAgent(agentId)
      ? videoPromptRequestContent(content)
      : isPhotoPromptAgent(agentId)
        ? photoPromptRequestContent(content)
        : displayContent;
    pendingAttachments.current = attachments;
    attachmentsByPrompt.current[displayContent] = attachments;
    const attachmentPayload = attachments.map((attachment) => ({ name: attachment.name, mime: attachment.type || "application/octet-stream", kind: attachment.kind, dataBase64: stripDataUrlBase64(attachment.dataUrl) }));
    try {
      const response = await fetch("/api/battles", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: requestContent, agentId, attachments: attachmentPayload,
          sessionId:activeSessionId,left: { ...left, provider: integratorProviderId(left.provider, catalogProviders) }, right: { ...right, provider: integratorProviderId(right.provider, catalogProviders) },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const data = await response.json().catch(()=>null) as {sessionId?:string;id?:string;left?:BattleAnswer;right?:BattleAnswer;balanceTokens?:number;error?:string}|null;
      if (Number.isFinite(data?.balanceTokens)) setBalanceTokens(data!.balanceTokens!);
      if(!response.ok||!data?.sessionId||!data.id||!data.left||!data.right) throw new Error(data?.error??copy.modelsUnavailable);
      if (attachments.length) attachmentsByRound.current[data.id] = attachments;
      await refresh(data.sessionId);
    } catch(error) {
      setSendError(error instanceof Error?error.message:copy.battleFailed);
    } finally {
      setGenerating(false);
    }
  }, [activeSessionId,agentId, catalogProviders, copy, generating, left, locale, refresh, right, router, setBalanceTokens, user]);

  const videoAllowedProviders = videoPrompt ? [...VIDEO_PROMPT_PROVIDERS] : undefined;
  const videoAllowedIds = videoPrompt ? [...VIDEO_PROMPT_MODELS] : undefined;

  const changeLeft = (next: SideSettings) => {
    if (!videoPrompt) {
      setLeft(next);
      return;
    }
    const model = videoPromptModelAllowed(next.model) ? next.model : videoPromptDefaultModel(videoIds);
    setLeft({ provider: videoPromptProviderForModel(model), model, depth: clampChatDepthForModel(model, next.depth) });
  };

  const changeRight = (next: SideSettings) => {
    if (!videoPrompt) {
      setRight(next);
      return;
    }
    const model = videoPromptModelAllowed(next.model) ? next.model : videoPromptDefaultModel(videoIds);
    setRight({ provider: videoPromptProviderForModel(model), model, depth: clampChatDepthForModel(model, next.depth) });
  };

  const onAgentChange = (id: string | null) => {
    setAgentId(id);
    if (!isVideoPromptAgent(id)) return;
    const first = videoPromptDefaultModel(videoIds);
    const second = videoPromptAlternateModel(first, videoIds);
    setLeft({ provider: videoPromptProviderForModel(first), model: first, depth: clampChatDepthForModel(first, videoPromptDepthForModel(first)) });
    setRight({ provider: videoPromptProviderForModel(second), model: second, depth: clampChatDepthForModel(second, videoPromptDepthForModel(second)) });
  };

  useEffect(() => {
    const last = rounds[rounds.length - 1];
    if (!last || pendingAttachments.current.length === 0) return;
    attachmentsByRound.current[last.id] = pendingAttachments.current;
    pendingAttachments.current = [];
  }, [rounds]);

  const repeatRound = (round: (typeof rounds)[number]) => {
    setComposerDraft({
      text: round.prompt,
      attachments: attachmentsByRound.current[round.id] ?? attachmentsByPrompt.current[round.prompt] ?? [],
      nonce: Date.now(),
    });
  };

  const copyRoundPrompt = async (round: (typeof rounds)[number]) => {
    try {
      await navigator.clipboard.writeText(round.prompt);
      setCopiedRoundId(round.id);
      window.setTimeout(() => setCopiedRoundId((current) => current === round.id ? null : current), 1600);
    } catch {
      setCopiedRoundId(null);
    }
  };

  const choose = async (roundIndex: number, side: Side) => {
    const round = rounds[roundIndex];
    if (round?.id) {
      setPreferred(round.id,side);
      const response=await fetch("/api/battles", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: round.id, preferredSide: side }) });
      if(response.ok) await refreshCatalog();
    }
  };

  if (!ready || !loaded || (!user && !IS_STAGING)) return <div className="grid flex-1 place-items-center text-sm text-steel"><Loader2 className="mr-2 inline size-4 animate-spin" />{copy.loadingBattles}</div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="relative z-40 overflow-visible border-b border-border bg-surface/95 px-3 py-1.5">
        <div className="mb-1 flex items-center justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(130px,180px)_minmax(0,1fr)]">
          <h1 className="inline-flex items-center gap-1.5 text-sm font-semibold text-text lg:col-start-2 lg:justify-self-center"><Swords className="size-3.5 text-accent-brand" />{t.workspace.menuBattle}</h1>
          <div className="grid grid-cols-2 rounded-lg bg-mist p-0.5 lg:hidden" aria-label={copy.answerSwitchAria}>
            {(["left", "right"] as Side[]).map((side) => <button key={side} type="button" onClick={() => setActiveSide(side)} className={cn("rounded-md px-3 py-1 text-[11px]", activeSide === side ? "bg-surface font-medium text-text shadow-sm" : "text-steel")}>{side === "left" ? copy.modelOne : copy.modelTwo}</button>)}
          </div>
        </div>
        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(130px,180px)_minmax(0,1fr)] items-end gap-2 lg:grid">
          <SelectorGroup value={left} onChange={changeLeft} label={copy.modelOne} models={models} allowedProviders={videoAllowedProviders} allowedIds={videoAllowedIds} />
          <div className="grid min-w-0 justify-items-stretch gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-steel">
            <span className="inline-flex items-center justify-center gap-1 normal-case tracking-normal">
              <span className="uppercase tracking-[0.12em]">{copy.agentLabel}</span>
              {agentId ? <ClearAgentButton tone="danger" onClear={() => onAgentChange(null)} /> : null}
            </span>
            <div className="min-w-0 [&>div]:w-full">
              <AgentPicker value={agentId} onChange={onAgentChange} className={pickerTrigger} />
            </div>
          </div>
          <SelectorGroup value={right} onChange={changeRight} label={copy.modelTwo} models={models} align="end" allowedProviders={videoAllowedProviders} allowedIds={videoAllowedIds} />
        </div>
        <div className="grid gap-2 lg:hidden">
          <SelectorGroup value={activeSide === "left" ? left : right} onChange={activeSide === "left" ? changeLeft : changeRight} label={activeSide === "left" ? copy.modelOne : copy.modelTwo} models={models} allowedProviders={videoAllowedProviders} allowedIds={videoAllowedIds} />
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-steel">
            <span className="inline-flex shrink-0 items-center gap-1">
              {copy.agentLabel}
              {agentId ? <ClearAgentButton tone="danger" onClear={() => onAgentChange(null)} /> : null}
            </span>
            <div className="min-w-0 flex-1 [&>div]:w-full">
              <AgentPicker value={agentId} onChange={onAgentChange} className={pickerTrigger} />
            </div>
          </div>
        </div>
      </header>

      <main data-lenis-prevent className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
        {rounds.length === 0 && !generating ? <div className="grid min-h-full place-items-center px-6 py-10 text-center"><div className="max-w-xl"><Swords className="mx-auto size-9 text-accent-brand" /><h2 className="mt-3 text-xl font-semibold text-text">{copy.battleEmptyTitle}</h2><p className="mt-2 text-sm text-steel">{copy.battleEmptySubtitle}</p></div></div> : null}
        <div className="divide-y divide-border">
          {rounds.map((round, roundIndex) => <section key={round.id} className="px-3 py-4"><div className="mx-auto mb-3 max-w-3xl"><p className="whitespace-pre-wrap break-words rounded-xl bg-accent-brand px-3 py-2 text-sm text-primary-foreground">{round.prompt}</p><div className="mt-1.5 flex items-center justify-center gap-1 px-1 text-steel"><button type="button" aria-label={copy.repeatRequest} title={copy.repeatRequest} onClick={() => repeatRound(round)} className="grid size-7 place-items-center rounded-lg text-steel transition-colors hover:bg-mist hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand"><RotateCcw className="size-3.5" /></button><button type="button" aria-label={copiedRoundId === round.id ? copy.requestCopied : copy.copyRequest} title={copiedRoundId === round.id ? copy.requestCopied : copy.copyRequest} onClick={() => void copyRoundPrompt(round)} className={cn("grid size-7 place-items-center rounded-lg text-steel transition-colors hover:bg-mist hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand", copiedRoundId === round.id && "text-emerald-500")}>{copiedRoundId === round.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button></div></div><div className="grid min-w-0 lg:grid-cols-2 lg:divide-x lg:divide-border">
            {(["left", "right"] as Side[]).map((side) => {
              const answer = round[side]; const roundSettings = side === "left" ? round.leftSettings : round.rightSettings;
              const modelName = models.find((model) => model.id === answer.model)?.name ?? answer.model;
              const depthLabel = depthLabels[roundSettings.depth];
              const failed = isFailedBattleAnswer(answer);
              return <article key={side} className={cn("min-w-0 px-1 lg:px-4", activeSide !== side && "hidden lg:block")}><div className={cn("rounded-2xl px-3 py-3 text-[13px] leading-relaxed", failed ? "bg-mist/60 text-steel" : "bg-mist text-text")}><p className="mb-1 text-[11px] font-semibold text-steel">{modelName} · {depthLabel}{failed ? ` · ${copy.noAnswer}` : ""}</p>{failed ? <p className="whitespace-pre-wrap text-destructive" role="alert">{promptErrorMessage(answer.content, locale)}</p> : <MarkdownMessage content={answer.content} />}</div><div className="mt-1.5 flex items-center gap-1 px-1"><Button type="button" size="sm" disabled={!round.id || failed} variant={round.preferred === side ? "default" : "outline"} className="me-1 h-7 gap-1 px-2 text-[11px]" onClick={async () => { choose(roundIndex, side); window.setTimeout(() => void refreshCatalog(), 150); }}>{round.preferred === side ? <Check className="size-3" /> : null}{copy.chooseAnswer}</Button>{!failed ? <ResponseActions messageId={`battle:${round.id}:${side}`} modelId={answer.model} modelName={modelName} content={answer.content} /> : null}<span className="ms-1 inline-flex shrink-0 items-center text-[11px] tabular-nums text-steel">{withCreditGlyphs(formatCompactTokens(failed ? 0 : answer.inputTokens + answer.outputTokens, locale))}</span><span className="ml-auto text-right text-[11px] tabular-nums text-steel">{failed ? "" : `${t.arena.thought} ${formatThinkingTime(answer.thinkingMs, locale)}`}</span></div></article>;
            })}
          </div></section>)}
        </div>
        {generating ? <div className="grid grid-cols-2 divide-x divide-border px-3 py-5 text-center text-xs text-steel"><span><Loader2 className="mr-1 inline size-3.5 animate-spin" />{copy.modelThinking(copy.modelOne)}</span><span><Loader2 className="mr-1 inline size-3.5 animate-spin" />{copy.modelThinking(copy.modelTwo)}</span></div> : null}
        <div ref={bottomRef} />
      </main>
      {sendError ? <p className="border-t border-border bg-mist px-4 py-2 text-center text-sm text-destructive" role="alert">{promptErrorMessage(sendError, locale)}</p> : null}
      <ChatComposer onSend={send} disabled={generating} allowDeviceAccess allowVideo={videoPrompt} videoOnly={videoPrompt} photoOnly={photoPrompt} className="shrink-0" draft={composerDraft} />
    </div>
  );
}

/**
 * Ответ не получен: провайдер не вернул ни одного токена, а вместо ответа пришёл текст ошибки.
 * Сам текст приходит на языке пользователя, поэтому опираться на него нельзя.
 */
function isFailedBattleAnswer(answer: BattleAnswer): boolean {
  return answer.inputTokens === 0 && answer.outputTokens === 0 && answer.content.trim().length > 0;
}

function toUiSettings(value:BattleSideSettings,models:CommercialModel[]):SideSettings{
  const provider=models.find((model)=>model.id===value.model)?.provider??providerNameFor(value.provider);
  return {provider,model:value.model,depth:value.depth};
}

function providerNameFor(id:string):CommercialModel["provider"]{
  const known:Record<string,CommercialModel["provider"]>={openai:"OpenAI",anthropic:"Anthropic",google:"Google",kimi:"Kimi",xai:"xAI",alibaba:"Alibaba",deepseek:"DeepSeek",meta:"Meta",minimax:"MiniMax"};
  return known[id]??id;
}
