import { FaqAccordion } from "@/components/catalog/faq-accordion";
import { SeoArticlePlaceholder } from "@/components/catalog/seo-article-placeholder";
import type { Locale } from "@/lib/i18n";
import { pageUrl, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";
import { IS_STAGING } from "@/lib/site-env";
import {
  BLOGORO_SEO_SLOT,
  getBlogoroPageSection,
  type BlogoroPagePath,
} from "@/lib/server/blogoro-page-sections";

type Props = {
  pagePath: BlogoroPagePath;
  articleId: "agents" | "images" | "models" | "pricing" | "rating" | "songs" | "videos";
  locale: Locale;
};

export async function BlogoroSeoArticleSlot({ pagePath, articleId, locale }: Props) {
  if (IS_STAGING) return <SeoArticlePlaceholder locale={locale} />;
  const published = await getBlogoroPageSection(pagePath, locale);
  if (!published) return <SeoArticlePlaceholder locale={locale} />;

  const canonical = pageUrl(pagePath, locale);
  const description = published.metaDescription || published.openGraph.description || published.title;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: published.h1,
        description,
        inLanguage: published.language,
        image: published.coverUrl ?? undefined,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
        mainEntityOfPage: canonical,
      },
      ...(published.faq.length ? [{
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: published.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }] : []),
    ],
  };
  const Heading = articleId === "videos" ? "h1" : "h2";

  return (
    <section
      id={`seo-${articleId}`}
      data-seo-article={articleId}
      data-blogoro-slot={BLOGORO_SEO_SLOT}
      data-blogoro-article-id={published.articleId}
      data-blogoro-revision={published.revision}
      className="mt-20 border-t border-border bg-mist/35"
      lang={published.language}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <article itemScope itemType="https://schema.org/Article" className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <Heading itemProp="headline" className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {published.h1}
        </Heading>
        {published.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- media is stored by the receiver and has no fixed dimensions
          <img
            src={published.coverUrl}
            alt={published.coverAlt ?? published.title}
            loading="lazy"
            className="mt-8 aspect-[12/7] w-full rounded-[24px] object-cover"
          />
        ) : null}
        <div
          itemProp="articleBody"
          className="article-body mt-10 space-y-5 text-sm leading-relaxed text-steel sm:text-base [&_.article-table]:overflow-x-auto [&_article]:text-text [&_a]:font-medium [&_a]:text-accent-brand [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:border-accent-brand/40 [&_blockquote]:ps-4 [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_h2]:scroll-mt-24 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text [&_h3]:scroll-mt-24 [&_h3]:pt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-text sm:[&_h3]:text-2xl [&_h4]:scroll-mt-24 [&_h4]:pt-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-text [&_img]:my-7 [&_img]:w-full [&_img]:rounded-[20px] [&_li]:ps-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4 [&_table]:w-full [&_table]:min-w-[560px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_td]:border-b [&_td]:border-border/70 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-semibold [&_th]:text-text [&_thead]:bg-surface [&_ul]:list-disc [&_ul]:ps-5"
          dangerouslySetInnerHTML={{ __html: published.bodyHtml }}
        />
        {published.faq.length ? <FaqAccordion title="FAQ" items={published.faq} /> : null}
      </article>
    </section>
  );
}
