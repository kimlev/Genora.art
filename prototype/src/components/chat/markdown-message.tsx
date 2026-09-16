"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { sanitizeAssistantContent } from "@/lib/assistant-content";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { isValidElement, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function normalizeAssistantMarkdown(value: string): string {
  return sanitizeAssistantContent(value);
}

function safeExternalUrl(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const copy = chatUiCopy(locale);
  const [copied, setCopied] = useState(false);
  const text = nodeText(children);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative my-3">
      <pre className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-xl border border-border bg-bg p-3 pe-11 text-xs leading-relaxed [overflow-wrap:anywhere]">{children}</pre>
      <button
        type="button"
        aria-label={copied ? copy.blockCopied : copy.copyBlock}
        onClick={() => void handleCopy()}
        className={cn(
          "absolute end-2 top-2 grid size-7 place-items-center rounded-lg text-steel transition-colors hover:bg-mist hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand",
          copied && "text-emerald-500",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("min-w-0 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const safeHref = safeExternalUrl(href);
            return safeHref ? <a href={safeHref} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-brand underline decoration-accent-brand/35 underline-offset-4 hover:decoration-accent-brand">{children}</a> : <span>{children}</span>;
          },
          h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-semibold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-accent-brand/45 pl-3 text-steel">{children}</blockquote>,
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className: codeClassName, children }) => <code className={cn(codeClassName, "whitespace-pre-wrap break-words rounded bg-bg px-1 py-0.5 font-mono text-[0.9em] text-text [overflow-wrap:anywhere]")}>{children}</code>,
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table className="w-full border-collapse text-xs">{children}</table></div>,
          th: ({ children }) => <th className="border border-border bg-bg px-2 py-1.5 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1.5 align-top">{children}</td>,
        }}
      >
        {normalizeAssistantMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
