"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function PromptCopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { locale } = useLocale();
  const copyLabel = locale === "ru" ? { copied: "Скопировано", copy: "Копировать" } : { copied: "Copied", copy: "Copy" };

  return (
    <button
      type="button"
      aria-label={copied ? copyLabel.copied : copyLabel.copy}
      title={copied ? copyLabel.copied : copyLabel.copy}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className={cn("grid size-8 place-items-center rounded-lg text-steel hover:bg-mist hover:text-text", className)}
    >
      {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
    </button>
  );
}
