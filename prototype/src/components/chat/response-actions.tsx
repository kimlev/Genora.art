"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { galleryCopy } from "@/lib/i18n/copy/gallery-copy";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { saveModelFeedback, useModelFeedback } from "@/lib/model-feedback";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.readOnly = true;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    if (!document.execCommand("copy")) throw new Error("copy_failed");
  } finally {
    area.remove();
  }
}

export function ResponseActions({
  messageId,
  modelId,
  modelName,
  content,
  className,
}: {
  messageId: string;
  modelId: string;
  modelName: string;
  content: string;
  className?: string;
}) {
  const { locale } = useLocale();
  const chat = chatUiCopy(locale);
  const gallery = galleryCopy(locale);
  const feedback = useModelFeedback();
  const vote = feedback.voteForMessage(messageId);
  const [status, setStatus] = useState<"copied" | "shared" | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const mark = (nextStatus: "copied" | "shared") => {
    setStatus(nextStatus);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus(null), 1400);
  };

  const copy = async () => {
    try {
      await copyText(content);
      mark("copied");
    } catch {
      // Clipboard access can be denied by the browser; leave the control reusable.
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: modelName, text: content });
      } else {
        await copyText(content);
      }
      mark("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  };

  const buttonClass = "rounded-lg p-1.5 transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand";

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5", className)}>
      <button type="button" aria-label={chat.helpfulAnswer} aria-pressed={vote === 1} onClick={() => saveModelFeedback(messageId, modelId, modelName, 1)} className={cn(buttonClass, vote === 1 && "bg-emerald-500/10 text-emerald-500")}><ThumbsUp className={cn("size-3.5", vote === 1 && "fill-current")} /></button>
      <button type="button" aria-label={chat.unhelpfulAnswer} aria-pressed={vote === -1} onClick={() => saveModelFeedback(messageId, modelId, modelName, -1)} className={cn(buttonClass, vote === -1 && "bg-red-500/10 text-red-500")}><ThumbsDown className={cn("size-3.5", vote === -1 && "fill-current")} /></button>
      <button type="button" aria-label={status === "shared" ? gallery.linkCopied : gallery.share} onClick={() => void share()} className={cn(buttonClass, status === "shared" && "text-emerald-500")}>
        {status === "shared" ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      </button>
      <button type="button" aria-label={status === "copied" ? chat.answerCopied : chat.copyAnswer} onClick={() => void copy()} className={cn(buttonClass, status === "copied" && "text-emerald-500")}>
        {status === "copied" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
