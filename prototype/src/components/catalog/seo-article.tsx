"use client";

import { FaqAccordion } from "@/components/catalog/faq-accordion";
import { useLocale } from "@/components/providers/locale-provider";
import { IMAGE_SEO_TECH_RU } from "@/lib/content/image-seo-article-ru";
import { MODELS_SEO_TECH_RU } from "@/lib/content/models-seo-article-ru";
import { VIDEO_SEO_TECH_RU } from "@/lib/content/video-seo-article-ru";
import { articleHeadingId, localizeArticleHref } from "@/lib/content/seo-article-links";
import { getSeoArticle, type SeoArticle as SeoArticleData, type SeoArticleBlock } from "@/lib/content/seo-articles";
import type { Locale } from "@/lib/i18n";
import { pageUrl, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";
import type { ReactNode } from "react";

type SeoArticleProps = {
  articleId: SeoArticleData["id"];
  pagePath?: string;
};

function renderRichText(text: string, locale: Locale): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={`${part}-${index}`} href={localizeArticleHref(link[2], locale)} className="font-medium text-[#FF6F00] underline underline-offset-2">
          {link[1]}
        </a>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={`${part}-${index}`} className="font-semibold text-text">{bold[1]}</strong>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function ArticleBlock({ block, section, index, locale }: { block: SeoArticleBlock; section: string; index: number; locale: Locale }) {
  const key = `${section}-${index}`;
  if (block.type === "h3") {
    return <h4 id={articleHeadingId(block.text)} className="scroll-mt-24 pt-2 text-base font-semibold text-text">{block.text}</h4>;
  }
  if (block.type === "h4") {
    return <h5 id={articleHeadingId(block.text)} className="scroll-mt-24 pt-1 text-sm font-semibold text-text">{block.text}</h5>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-2 ps-5">
        {block.items.map((item) => (
          <li key={item}>{renderRichText(item, locale)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="list-decimal space-y-2 ps-5">
        {block.items.map((item) => (
          <li key={item}>{renderRichText(item, locale)}</li>
        ))}
      </ol>
    );
  }
  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="bg-mist/70 text-text">
            <tr>
              {block.headers.map((header) => (
                <th key={header} className="px-3 py-2 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join("|")} className="border-t border-border">
                {row.map((cell, cellIndex) => (
                  <td key={`${key}-${cellIndex}`} className="px-3 py-2 align-top">{renderRichText(cell, locale)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p>{renderRichText(block.text, locale)}</p>;
}

function buildArticleJsonLd(article: SeoArticleData, locale: Locale, canonicalPath: string) {
  const url = pageUrl(canonicalPath, locale);
  const description = locale === "ru" && article.id === "images"
    ? IMAGE_SEO_TECH_RU.description
    : locale === "ru" && article.id === "models"
      ? MODELS_SEO_TECH_RU.description
    : locale === "ru" && article.id === "videos" ? VIDEO_SEO_TECH_RU.description : article.lead;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/favicon/icon-512.png`,
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: article.title,
        description,
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        mainEntity: { "@id": `${url}#article` },
      },
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.title,
        description,
        inLanguage: locale,
        author: { "@id": `${SITE_ORIGIN}/#organization` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        mainEntityOfPage: { "@id": `${url}#webpage` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: article.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function SeoArticle({ articleId, pagePath = `/${articleId === "images" ? "image-examples" : articleId}` }: SeoArticleProps) {
  const { locale } = useLocale();
  const article = getSeoArticle(articleId, locale);
  const jsonLd = buildArticleJsonLd(article, locale, pagePath);

  return (
    <section
      id={`seo-${article.id}`}
      data-seo-article={article.id}
      className="mt-20 border-t border-border bg-mist/35"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article itemScope itemType="https://schema.org/Article" className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        {article.id === "videos" ? (
          <h1 itemProp="headline" className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">{article.title}</h1>
        ) : (
          <h2 itemProp="headline" className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">{article.title}</h2>
        )}
        <p itemProp="description" className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{article.lead}</p>

        <div className="mt-12 space-y-12">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h3 id={articleHeadingId(section.heading)} className="scroll-mt-24 text-xl font-semibold tracking-tight text-text sm:text-2xl">{section.heading}</h3>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-steel sm:text-base">
                {section.blocks.map((block, index) => (
                  <ArticleBlock key={`${section.heading}-${index}`} block={block} section={section.heading} index={index} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <FaqAccordion title={article.faqTitle} items={article.faq} />
      </article>
    </section>
  );
}
