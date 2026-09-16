"use client";
import { isPromptBlocked, promptErrorMessage } from "@/lib/public-error";

import { formatCompactTokens, useAuth } from "@/components/providers/auth-provider";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { ResponseActions } from "@/components/chat/response-actions";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import type { ChatMessage } from "@/lib/mock/chat-demo";
import { getAgentById } from "@/lib/mock/agents";
import { useCustomAgents } from "@/lib/custom-agents";
import { getModelById } from "@/lib/mock/models";
import { cn } from "@/lib/utils";
import { formatThinkingTime } from "@/lib/thinking-time";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { Bot, FileAudio, FileText, Loader2, Sparkles, User, Video } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/ui/locale-link";
import { useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "./markdown-message";

type ChatMessagesProps = {
  messages: ChatMessage[];
  isGenerating: boolean;
  agentId: string | null;
  className?: string;
};

export function ChatMessages({ messages, isGenerating, agentId, className }: ChatMessagesProps) {
  const t = useT();
  const { locale } = useLocale();
  const copy = chatUiCopy(locale);
  const { user } = useAuth();
  const { models } = useCatalog();
  const { customAgents } = useCustomAgents();
  const [thinkingTick, setThinkingTick] = useState(0);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollTimerRef = useRef<number | null>(null);
  const agent = agentId ? (getAgentById(agentId) ?? customAgents.find((item) => item.id === agentId)) : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setActiveMessageIndex(Math.max(messages.length - 1, 0));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      setThinkingTick(0);
      return;
    }
    const timer = window.setInterval(() => setThinkingTick((value) => value + 1), 3200);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => () => {
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
  }, []);

  const handleScroll = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport || messages.length === 0) return;
    const scrollableDistance = viewport.scrollHeight - viewport.clientHeight;
    const progress = scrollableDistance > 0 ? viewport.scrollTop / scrollableDistance : 1;
    setActiveMessageIndex(Math.min(messages.length - 1, Math.max(0, Math.round(progress * (messages.length - 1)))));
    setIsScrolling(true);
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => setIsScrolling(false), 900);
  };

  const scrollToMessage = (index: number) => {
    messageRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveMessageIndex(index);
  };

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center px-6 py-12 text-center", className)}>
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-mist text-accent-brand"><Bot className="size-7" /></div>
        <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{t.chat.welcome}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-steel sm:text-base">{t.chat.welcomeSubtitle}</p>
        {agent ? <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-steel"><Sparkles className="size-3.5 text-accent-brand" />{t.agents.items[agent.id]?.name ?? agent.name}</p> : null}
        <p className="mt-6 text-sm text-steel">{t.chat.emptyState}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div ref={scrollViewportRef} onScroll={handleScroll} className="size-full overflow-y-auto overscroll-contain scroll-smooth">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        {messages.map((message, messageIndex) => {
          const isUserMessage = message.role === "user";
          const modelName = message.modelId
            ? models.find((model) => model.id === message.modelId)?.name ?? getModelById(message.modelId)?.name ?? message.modelId
            : undefined;
          return (
            <div ref={(element) => { messageRefs.current[messageIndex] = element; }} key={message.id} className={cn("flex gap-3", isUserMessage && "flex-row-reverse")}>
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isUserMessage ? "bg-accent-brand text-primary-foreground" : "bg-mist text-accent-brand")}>
                {isUserMessage ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div className={cn("max-w-[85%] min-w-0", isUserMessage && "flex flex-col items-end")}>
                <div className={cn("min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed", isUserMessage ? "bg-accent-brand text-primary-foreground" : "bg-mist text-text")}>
                  {message.image ? <Image src={message.image} alt={copy.userPhotoAlt} width={160} height={160} unoptimized className="mb-2 size-24 rounded-xl border border-white/30 object-cover" /> : null}
                  {message.attachments?.filter((item) => item.kind !== "image").length ? <div className="mb-2 flex flex-wrap gap-1.5">{message.attachments.filter((item) => item.kind !== "image").map((item) => <span key={`${item.kind}-${item.name}`} className="inline-flex max-w-64 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px]"><span>{item.kind === "video" ? <Video className="size-3.5" /> : item.kind === "audio" ? <FileAudio className="size-3.5" /> : <FileText className="size-3.5" />}</span><span className="truncate">{item.name}</span></span>)}</div> : null}
                  {!isUserMessage && isPromptBlocked(message.content)
                    ? <p className="text-destructive" role="alert">{promptErrorMessage(message.content, locale)}</p>
                    : !isUserMessage && user ? <MarkdownMessage content={message.content} /> : <span className="whitespace-pre-wrap">{message.content}</span>}
                  {message.link ? <Link href={message.link.href} target="_blank" rel="noopener" className="mt-3 block font-semibold text-accent-brand underline underline-offset-4">{message.link.label}</Link> : null}
                </div>

                {isUserMessage && user && modelName ? (
                  <p className="mt-1.5 px-1 text-[11px] tabular-nums text-steel">{modelName}</p>
                ) : null}

                {!isUserMessage && user ? (
                  <div className="mt-1.5 flex w-full items-center gap-1 px-1 text-steel" aria-label={copy.responseActions(modelName ?? "")}>
                    <ResponseActions messageId={message.id} modelId={message.modelId ?? ""} modelName={modelName ?? ""} content={message.content} />
                    {modelName ? <span className="ml-1 min-w-0 truncate text-[11px] font-medium text-steel">{modelName}</span> : null}
                    {(message.tokenCount ?? 0) > 0 ? <span className="ml-1 inline-flex shrink-0 items-center text-[11px] tabular-nums text-steel">{withCreditGlyphs(formatCompactTokens(message.tokenCount ?? 0, locale))}</span> : null}
                    <span className="ml-auto text-right text-[11px] tabular-nums text-steel">{copy.thoughtFor(formatThinkingTime(message.thinkingMs, locale))}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {isGenerating ? <div className="flex gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mist text-accent-brand"><Bot className="size-4" /></div><div className="flex items-center gap-2 rounded-2xl bg-mist px-4 py-3 text-sm text-steel"><Loader2 className="size-4 animate-spin" />{locale === "ru" ? (thinkingTick % 2 === 0 ? "Модель думает…" : "Genora.art уже решает вашу проблему…") : t.chat.thinking}</div></div> : null}
        <div ref={bottomRef} />
        </div>
      </div>

      {user && messages.length > 1 ? (
        <nav
          aria-label={copy.messageNav}
          className={cn(
            "absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-start gap-1 rounded-r-3xl border-y border-r border-border/50 bg-surface/85 py-3 pl-2 pr-2.5 shadow-sm backdrop-blur-md transition-opacity md:flex",
            isScrolling ? "opacity-100" : "opacity-45 hover:opacity-100",
          )}
        >
          {messages.map((message, index) => {
            const distance = Math.abs(index - activeMessageIndex);
            const width = distance === 0 ? 26 : Math.max(7, 20 - distance * 4);
            return (
              <button
                key={message.id}
                type="button"
                aria-label={copy.goToMessage(index + 1)}
                aria-current={index === activeMessageIndex ? "true" : undefined}
                onClick={() => scrollToMessage(index)}
                className={cn(
                  "h-0.5 rounded-full transition-[width,background-color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand",
                  index === activeMessageIndex ? "bg-text opacity-100" : "bg-steel opacity-55 hover:opacity-100",
                )}
                style={{ width }}
              />
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
