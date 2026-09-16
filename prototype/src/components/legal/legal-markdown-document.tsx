import { getLegalDocument, legalTextLocale } from "@/lib/legal/documents";
import type { Locale } from "@/lib/i18n";
import { applyPublicContactEmail, DEFAULT_PUBLIC_EMAIL } from "@/lib/public-contact";
import { getPrimarySupportEmail } from "@/lib/server/support-mailboxes";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type LegalMarkdownDocumentProps = {
  slug: string;
  locale?: Locale;
};

export async function LegalMarkdownDocument({ slug, locale = "ru" }: LegalMarkdownDocumentProps) {
  const document = getLegalDocument(slug);
  if (!document) return null;

  const russianPath = path.join(process.cwd(), "content", "legal", document.fileName);
  const englishPath = path.join(process.cwd(), "content", "legal", "en", document.fileName);
  const useEnglish = legalTextLocale(locale) === "en" && existsSync(englishPath);
  const contactEmail = await getPrimarySupportEmail().catch(() => DEFAULT_PUBLIC_EMAIL);
  const source = applyPublicContactEmail(readFileSync(useEnglish ? englishPath : russianPath, "utf8"), contactEmail);

  return (
    <article className="min-w-0 rounded-[28px] border border-border bg-surface px-5 py-7 shadow-[0_18px_55px_-42px_rgba(30,73,128,.45)] sm:px-8 sm:py-9">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-balance text-3xl font-bold tracking-tight text-text sm:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 border-t border-border pt-8 text-xl font-bold tracking-tight text-text first:mt-0 first:border-0 first:pt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-7 text-base font-bold text-text">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mt-3 text-sm leading-7 text-steel">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-steel">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-steel">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-5 rounded-2xl border border-accent-brand/20 bg-mist/55 px-5 py-2 text-steel">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-9 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-accent-brand underline decoration-accent-brand/30 underline-offset-4 hover:decoration-accent-brand"
              {...(href?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div data-lenis-prevent className="mt-5 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs text-steel">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-mist text-text">{children}</thead>,
          th: ({ children }) => <th className="border-b border-border px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-4 py-3 align-top leading-5 last:border-b-0">{children}</td>,
          code: ({ children }) => (
            <code className="rounded bg-mist px-1.5 py-0.5 text-[.9em] text-text">{children}</code>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
