"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import type { ChatMessage } from "@/lib/mock/chat-demo";
import type { Conversation } from "@/lib/mock/conversations";
import { getAgentById } from "@/lib/mock/agents";
import { useCustomAgents } from "@/lib/custom-agents";
import { stripDataUrlBase64 } from "@/lib/chat-attachments";
import { chatModelShowsDepthPicker, isGemmaChatModel } from "@/lib/chat-request-policy";
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
  videoPromptDefaultModel,
  videoPromptModelAllowed,
  videoPromptModelForProvider,
  videoPromptProviderForModel,
  videoPromptDisplayContent,
  videoPromptRequestContent,
} from "@/lib/video-prompt-agent";
import { integratorProviderId } from "@/lib/provider-id";
import { alignUsageTokens } from "@/lib/credits";
import { writePendingChat } from "@/lib/chat-pending-generation";
import { publicErrorMessage } from "@/lib/public-error";
import { isPageDisconnect, waitForGenerationJob } from "@/lib/generation-job-client";
import { addUsageEntry } from "@/lib/usage-history";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentPicker, ClearAgentButton } from "./agent-picker";
import { ChatComposer, type ComposerAttachment } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { normalizeAssistantMarkdown } from "./markdown-message";
import { DepthPicker, type DepthSelection } from "./depth-picker";
import { ModelPicker, type ModelSelection } from "./model-picker";
import { ProviderPicker, type ProviderSelection } from "./provider-picker";

function createMessage(
  role: ChatMessage["role"],
  content: string,
  options: Pick<ChatMessage, "modelId" | "tokenCount" | "thinkingMs" | "image" | "attachments"> = {},
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    ...options,
    timestamp: new Date().toISOString(),
  };
}

function deriveTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 42)}…`;
}

export function ChatShell() {
  const t = useT();
  const { locale } = useLocale();
  const copy = chatUiCopy(locale);
  const { user, setBalanceTokens } = useAuth();
  const { models, providers: catalogProviders } = useCatalog();
  const { customAgents } = useCustomAgents();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeAgentId,
    setActiveAgentId,
    loading: workspaceLoading,
    generatingIds,
    beginGeneration,
    finishGeneration,
  } = useWorkspace();
  const [modelSelection, setModelSelection] = useState<ModelSelection>("auto");
  const [providerSelection, setProviderSelection] = useState<ProviderSelection>("auto");
  const [depthSelection, setDepthSelection] = useState<DepthSelection>("auto");
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;
  const isGenerating = Boolean(activeConversationId && generatingIds.includes(activeConversationId));

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ),
    [activeConversationId, conversations],
  );

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    if (!activeConversation) return;
    const timer = window.setTimeout(() => {
      setProviderSelection(providerSelectionFor(activeConversation.providerId, activeConversation.modelId, models));
      setModelSelection(activeConversation.modelId ?? "auto");
      setDepthSelection((activeConversation.depthId as DepthSelection) ?? "auto");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeConversation, models]);

  useEffect(() => {
    if (activeConversationId || activeAgentId) return;
    setProviderSelection("auto");
    setModelSelection("auto");
    setDepthSelection("auto");
  }, [activeAgentId, activeConversationId]);

  const videoPrompt = isVideoPromptAgent(activeAgentId);
  const photoPrompt = isPhotoPromptAgent(activeAgentId);
  useEffect(() => {
    if (!videoPrompt) return;
    setModelSelection((current) => {
      const next = current !== "auto" && VIDEO_PROMPT_MODELS.includes(current as typeof VIDEO_PROMPT_MODELS[number])
        ? current
        : videoPromptDefaultModel(models.map((model) => model.id));
      setProviderSelection(videoPromptProviderForModel(next));
      setDepthSelection(videoPromptDepthForModel(next));
      return next;
    });
  }, [models, videoPrompt]);

  const handleSend = useCallback(
    async (content: string, attachments: ComposerAttachment[]) => {
      if (activeConversationId && generatingIds.includes(activeConversationId)) return;

      // Без авторизации ответ не выдаём — отправляем на регистрацию в новой вкладке
      if (!user) {
        window.open("/register", "_blank", "noopener");
        return;
      }

      const requestAgentId = activeAgentId;
      if (isVideoPromptAgent(requestAgentId) && !attachments.some((item) => item.kind === "video")) return;
      if (isPhotoPromptAgent(requestAgentId) && !attachments.some((item) => item.kind === "image")) return;
      if (isVideoPromptAgent(requestAgentId) && !videoPromptModelAllowed(modelSelection)) return;
      const requestedModelId = modelSelection;
      const displayModelId = requestedModelId === "auto"
        ? (getAgentById(requestAgentId ?? "")?.modelId ?? customAgents.find((agent) => agent.id === requestAgentId)?.modelId)
        : requestedModelId;
      const displayContent = isVideoPromptAgent(requestAgentId)
        ? videoPromptDisplayContent(content, locale)
        : isPhotoPromptAgent(requestAgentId)
          ? photoPromptDisplayContent(content, locale)
          : (content || copy.attachmentOnlyPrompt);
      const requestContent = isVideoPromptAgent(requestAgentId)
        ? videoPromptRequestContent(content)
        : isPhotoPromptAgent(requestAgentId)
          ? photoPromptRequestContent(content)
          : displayContent;
      const attachmentPayload = attachments.map((attachment) => ({
        name: attachment.name,
        mime: attachment.type || "application/octet-stream",
        kind: attachment.kind,
        dataBase64: stripDataUrlBase64(attachment.dataUrl),
      }));

      const userMessage = createMessage("user", displayContent, {
        modelId: displayModelId,
        image: attachments.find((attachment) => attachment.kind === "image")?.dataUrl,
        attachments: attachments.map((attachment) => ({ name: attachment.name, mime: attachment.type, kind: attachment.kind, size: attachment.size })),
      });
      const now = new Date().toISOString();
      let targetId = activeConversationId;
      const usageChatTitle = (activeConversation?.messages.length ? activeConversation.title : deriveTitle(content || attachments.find((item) => item.kind === "image" || item.kind === "video")?.name || "")).trim() || t.workspace.newChat;

      if (activeConversationId) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === activeConversationId
              ? {
                  ...conversation,
                  title:
                    conversation.messages.length === 0
                      ? deriveTitle(content || attachments.find((item) => item.kind === "image" || item.kind === "video")?.name || "")
                      : conversation.title,
                  updatedAt: now,
                  providerId: isVideoPromptAgent(requestAgentId) ? videoPromptProviderForModel(String(requestedModelId)) : (providerSelection === "auto" ? null : providerSelection),
                  modelId: requestedModelId === "auto" ? null : requestedModelId,
                  depthId: depthSelection,
                  agentId: requestAgentId,
                  messages: [...conversation.messages, userMessage],
                }
              : conversation,
          ),
        );
      } else {
        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          title: deriveTitle(content || attachments.find((item) => item.kind === "image" || item.kind === "video")?.name || ""),
          updatedAt: now,
          modelId: requestedModelId === "auto" ? null : requestedModelId,
          providerId: isVideoPromptAgent(requestAgentId) ? videoPromptProviderForModel(String(requestedModelId)) : (providerSelection === "auto" ? null : providerSelection),
          depthId: depthSelection,
          agentId: requestAgentId,
          messages: [userMessage],
        };

        targetId = newConversation.id;
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        writePendingChat(user.id, newConversation);
      }

      if (!targetId) return;
      if (activeConversationId && activeConversation) {
        writePendingChat(user.id, {
          ...activeConversation,
          updatedAt: now,
          messages: [...activeConversation.messages, userMessage],
        });
      }
      beginGeneration(targetId);
      let disconnected = false;

      try {
        const selectedModel = models.find((model) => model.id === requestedModelId);
        const providerName = isVideoPromptAgent(requestAgentId)
          ? videoPromptProviderForModel(requestedModelId)
          : providerSelection === "auto" ? selectedModel?.provider : providerSelection;
        const providerId = providerSelection === "auto" && requestedModelId === "auto" ? "auto" : integratorProviderId(providerName ?? models.find((model) => model.id === requestedModelId)?.provider, catalogProviders);
        const apiResponse = await fetch("/api/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", "x-genora-job-protocol": "1" },
          body: JSON.stringify({ conversationId: targetId, title: usageChatTitle, providerId, modelId: requestedModelId,
            depth: depthSelection, agentId: requestAgentId, content: requestContent,
            attachments: attachmentPayload, locale, userMessageId: userMessage.id,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        });
        const payload = await apiResponse.json().catch(() => null) as {
          job?: { id: string };
          message?: ChatMessage;
          usage?: { inputTokens: number; outputTokens: number; billedTokens: number };
          route?: { providerId: string; modelId: string; depth: DepthSelection };
          balanceTokens?: number;
          error?: string;
        } | null;
        if (Number.isFinite(payload?.balanceTokens)) setBalanceTokens(payload!.balanceTokens!);
        let message = payload?.message;
        let usage = payload?.usage;
        let route = payload?.route;
        if (payload?.job?.id && (apiResponse.status === 202 || !message || !usage)) {
          const job = await waitForGenerationJob(payload.job.id);
          message = job.result?.message as ChatMessage | undefined;
          usage = job.result?.usage as { inputTokens: number; outputTokens: number; billedTokens: number } | undefined;
          route = job.result?.route as { providerId: string; modelId: string; depth: DepthSelection } | undefined;
          if (Number.isFinite(job.result?.balanceTokens)) setBalanceTokens(Number(job.result?.balanceTokens));
        }
        if (!message || !usage) {
          const failure = new Error(payload?.error ?? copy.modelUnavailable) as Error & { topUp?: boolean };
          if (apiResponse.status === 402) failure.topUp = true;
          throw failure;
        }
        const ledger = alignUsageTokens({
          billed: usage.billedTokens,
        });
        const resolvedModelId = route?.modelId ?? message.modelId ?? displayModelId ?? requestedModelId;
        const assistantMessage = {
          ...message,
          content: normalizeAssistantMarkdown(message.content),
          modelId: resolvedModelId,
          tokenCount: ledger.billedTokens,
        };

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === targetId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  providerId: isVideoPromptAgent(requestAgentId) ? videoPromptProviderForModel(String(requestedModelId)) : (providerSelection === "auto" ? null : providerSelection),
                  modelId: requestedModelId === "auto" ? null : requestedModelId,
                  depthId: depthSelection,
                  messages: conversation.messages.some((item) => item.id === assistantMessage.id)
                    ? conversation.messages
                    : [
                    ...conversation.messages.map((item) => item.id === userMessage.id
                      ? { ...item, tokenCount: 0, modelId: resolvedModelId }
                      : item),
                    assistantMessage,
                  ],
                }
              : conversation,
          ),
        );

        const modelName = models.find((model) => model.id === resolvedModelId)?.name ?? resolvedModelId;
        const selectedAgent = requestAgentId ? (getAgentById(requestAgentId) ?? customAgents.find((agent) => agent.id === requestAgentId)) : null;
        if (targetId) {
          addUsageEntry(user.email, {
            id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            conversationId: targetId,
            chatTitle: usageChatTitle,
            model: modelName,
            modelId: resolvedModelId,
            agent: selectedAgent?.name ?? t.workspace.noAgent,
            inputTokens: 0,
            outputTokens: ledger.billedTokens,
            billedTokens: ledger.billedTokens,
          });
        }
      } catch (error) {
        if (isPageDisconnect(error)) {
          disconnected = true;
          return;
        }
        const stillCreating = await fetch("/api/generation-jobs", { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { jobs?: Array<{ kind?: string; status?: string; conversationId?: string | null }> } | null) =>
            Boolean(data?.jobs?.some((job) => job.kind === "chat" && job.status === "creating" && job.conversationId === targetId)))
          .catch(() => false);
        if (stillCreating) {
          disconnected = true;
          return;
        }
        const raw = error instanceof Error ? error.message : copy.serverError;
        const reason = /failed to fetch|networkerror|load failed/i.test(raw) ? copy.modelUnavailable : publicErrorMessage(raw, locale);
        const assistantMessage = createMessage("assistant", (error as { topUp?: boolean }).topUp ? (reason || copy.topUpToSeeAnswer) : copy.requestFailed(reason));
        setConversations((prev) => prev.map((conversation) => conversation.id === targetId
          ? { ...conversation, updatedAt: new Date().toISOString(), messages: [...conversation.messages, assistantMessage] }
          : conversation));
      } finally {
        if (!disconnected) finishGeneration(targetId, activeIdRef.current !== targetId);
        if (requestAgentId) {
          setActiveAgentId(null);
          setProviderSelection("auto");
          setModelSelection("auto");
          setDepthSelection("auto");
        }
      }
    },
    [
      activeAgentId,
      activeConversationId,
      activeConversation,
      catalogProviders,
      copy,
      customAgents,
      beginGeneration,
      depthSelection,
      finishGeneration,
      generatingIds,
      locale, models,
      modelSelection,
      providerSelection,
      setActiveAgentId,
      setActiveConversationId,
      setConversations,
      setBalanceTokens,
      t.workspace.newChat,
      t.workspace.noAgent,
      user,
    ],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative z-40 flex flex-wrap items-center gap-2 overflow-visible border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <ProviderPicker
          value={providerSelection}
          showLogos
          allowAuto={!videoPrompt}
          allowedProviders={videoPrompt ? [...VIDEO_PROMPT_PROVIDERS] : undefined}
          onChange={(provider) => {
            setProviderSelection(provider);
            if (videoPrompt) {
              const next = videoPromptModelForProvider(provider, models.map((item) => item.id));
              setModelSelection(next);
              setDepthSelection(videoPromptDepthForModel(next));
            } else setModelSelection("auto");
          }}
        />
        <ModelPicker
          value={modelSelection}
          allowAuto={!videoPrompt}
          allowedIds={videoPrompt ? [...VIDEO_PROMPT_MODELS] : undefined}
          onChange={(model) => {
            setModelSelection(model);
            if (videoPrompt && model !== "auto") {
              setProviderSelection(videoPromptProviderForModel(model));
              setDepthSelection(videoPromptDepthForModel(model));
              return;
            }
            if (isGemmaChatModel(model) || (model !== "auto" && models.find((item) => item.id === model)?.capabilities?.reasoning == null)) setDepthSelection("auto");
          }}
          provider={providerSelection}
        />
        {chatModelShowsDepthPicker(modelSelection, models.find((model) => model.id === modelSelection)?.capabilities?.reasoning) ? <DepthPicker value={depthSelection} onChange={setDepthSelection} modelId={modelSelection} /> : null}
        <div className="flex min-w-0 items-center gap-1.5">
          <AgentPicker value={activeAgentId} onChange={setActiveAgentId} />
          {activeAgentId ? <ClearAgentButton onClear={() => setActiveAgentId(null)} /> : null}
        </div>
      </header>

      {workspaceLoading && !isGenerating && messages.length === 0 ? <div className="grid min-h-0 flex-1 place-items-center"><LoaderCircle className="size-7 animate-spin text-accent-brand"/></div> : <ChatMessages
        messages={messages}
        isGenerating={isGenerating}
        agentId={activeAgentId}
        className="relative z-0"
      />}

      <ChatComposer
        onSend={handleSend}
        disabled={isGenerating}
        allowDeviceAccess={Boolean(user)}
        allowVideo={videoPrompt}
        videoOnly={videoPrompt}
        photoOnly={photoPrompt}
      />
    </div>
  );
}

function providerSelectionFor(providerId: string | null | undefined, modelId: string | null | undefined, models: Array<{id:string;provider:string}>): ProviderSelection {
  const modelProvider = modelId ? models.find((model) => model.id === modelId)?.provider : undefined;
  if (modelProvider) return modelProvider;
  const known: Record<string, ProviderSelection> = { openai:"OpenAI", anthropic:"Anthropic", google:"Google", kimi:"Kimi", xai:"xAI", alibaba:"Alibaba", deepseek:"DeepSeek", meta:"Meta", minimax:"MiniMax" };
  return known[String(providerId ?? "").toLowerCase()] ?? (providerId as ProviderSelection) ?? "auto";
}
