import type { Locale } from "@/lib/i18n";
import { FileText } from "lucide-react";

const LABELS: Record<Locale, string> = {
  ar: "مقالة تحسين محركات البحث",
  cs: "SEO článek",
  de: "SEO-Artikel",
  el: "Άρθρο SEO",
  en: "SEO article",
  es: "Artículo SEO",
  fr: "Article SEO",
  hi: "SEO लेख",
  it: "Articolo SEO",
  ja: "SEO記事",
  ko: "SEO 기사",
  nl: "SEO-artikel",
  pl: "Artykuł SEO",
  pt: "Artigo SEO",
  ro: "Articol SEO",
  ru: "СЕО статья",
  sv: "SEO-artikel",
  tr: "SEO makalesi",
  zh: "SEO文章",
};

export function SeoArticlePlaceholder({ locale }: { locale: Locale }) {
  return (
    <section
      data-blogoro-slot="seo-article"
      data-blogoro-placeholder="true"
      className="mt-20 border-y border-dashed border-accent-brand/35 bg-mist/35"
      lang={locale}
    >
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex min-h-40 items-center justify-center rounded-[24px] border-2 border-dashed border-accent-brand/45 bg-surface/80 px-6 text-center">
          <p className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight text-accent-brand sm:text-2xl">
            <FileText className="size-6" aria-hidden="true" />
            {LABELS[locale]}
          </p>
        </div>
      </div>
    </section>
  );
}
