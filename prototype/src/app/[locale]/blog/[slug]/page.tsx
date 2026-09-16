import { ArticleToc } from "@/components/blog/article-toc";
import { SiteFooter } from "@/components/layout/site-footer";
import type { BlogPost } from "@/lib/blog/posts";
import { getBlogPost, getBlogPosts } from "@/lib/blog/posts-query";
import { getDictionary, getLocaleOption, isLocale, type Dictionary, type Locale } from "@/lib/i18n";
import { splitLocalePath, withLocalePath } from "@/lib/i18n/locale-path";
import { requestLocale } from "@/lib/i18n/request-locale";
import { localeFromValue, pageUrl, SITE_ORIGIN } from "@/lib/seo";
import { IS_STAGING } from "@/lib/site-env";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

function AllArticlesLink({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <nav aria-label={t.blogPreview.allPosts} className="mt-10 border-t border-border pt-6">
      <Link href={withLocalePath("/blog", locale)} className="inline-flex items-center gap-2 text-sm font-medium text-accent-brand transition-colors hover:text-text">
        {t.blogPreview.allPosts}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}

/** Видимая метка языка, на котором написана статья */
function ArticleLanguageBadge({ language, t }: { language: string; t: Dictionary }) {
  if (!isLocale(language)) return null;
  const option = getLocaleOption(language);
  return (
    <span
      lang={option.code}
      className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs text-steel"
    >
      <span aria-hidden>{option.flag}</span>
      <span className="sr-only">{t.blogPreview.articleLanguage}: </span>
      {option.label}
    </span>
  );
}

/**
 * Canonical должен указывать на адрес, который открывается напрямую.
 * Blogoro присылает адрес без языкового префикса, поэтому свой домен пересобираем,
 * а канонический адрес на чужом домене оставляем как есть.
 */
function articleCanonical(post: BlogPost, articleLocale: Locale): string {
  const external = post.canonicalUrl?.trim();
  if (external) {
    try {
      const url = new URL(external, SITE_ORIGIN);
      if (url.origin !== SITE_ORIGIN) return url.toString();
      return pageUrl(splitLocalePath(url.pathname).path, articleLocale);
    } catch {
      /* некорректный адрес из внешнего сервиса — собираем свой */
    }
  }
  return pageUrl(`/blog/${post.slug}`, articleLocale);
}

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  if (IS_STAGING) return [];
  return (await getBlogPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post) return {};
  const articleLocale = localeFromValue(post.language);
  const canonical = articleCanonical(post, articleLocale);
  const openGraphLocale = post.pageLanguage ?? getLocaleOption(articleLocale).intl.replace("-", "_");
  if (post.source === "blogoro") {
    return {
      title: { absolute: post.title },
      description: post.excerpt,
      robots: { index: !IS_STAGING, follow: !IS_STAGING },
      alternates: { canonical },
      openGraph: {
        type: "article",
        title: post.openGraph?.title ?? post.title,
        description: post.openGraph?.description ?? post.excerpt,
        images: post.image ? [post.image] : undefined,
        publishedTime: post.publishedAt,
        locale: openGraphLocale,
        url: canonical,
      },
      twitter: {
        card: "summary_large_image",
        title: post.openGraph?.title ?? post.title,
        description: post.openGraph?.description ?? post.excerpt,
      },
    };
  }
  return {
    title: `${post.title} — Genora.art`,
    description: post.excerpt,
    robots: { index: !IS_STAGING, follow: !IS_STAGING },
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
      publishedTime: post.publishedAt,
      locale: openGraphLocale,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const locale = await requestLocale();
  const t = getDictionary(locale);
  const articleLanguage = post.pageLanguage ?? post.language;
  const published = new Intl.DateTimeFormat(getLocaleOption(locale).intl, { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${post.publishedAt}T12:00:00Z`));

  if (post.source === "blogoro") {
    const sections = post.sections ?? [];
    const jsonLd = post.jsonLd ?? [];
    return (
      <>
        <main className="flex-1">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
            <ArticleToc
              label={t.blogPreview.sectionsLabel}
              title={t.blogPreview.inThisArticle}
              items={sections}
            />
            <article className="order-1 min-w-0 lg:order-2" lang={articleLanguage}>
              {jsonLd.map((block, index) => (
                <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-[#FF6F00]">{post.topic} · {post.readingMinutes} {t.blogPreview.readTime}</p>
                <ArticleLanguageBadge language={post.language} t={t} />
              </div>
              <time dateTime={post.publishedAt} className="mt-2 block text-sm text-steel">{t.blogPreview.published} {published}</time>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-text sm:text-5xl">{post.h1 ?? post.title}</h1>
              {post.image ? (
                <Image src={post.image} alt={post.coverAlt ?? ""} width={960} height={560} priority className="mt-8 aspect-[12/7] w-full rounded-[24px] object-cover" />
              ) : null}
              <div
                className="article-body mt-10 space-y-5 text-base leading-8 text-text/85 [&_.article-table]:overflow-x-auto [&_a]:font-medium [&_a]:text-accent-brand [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent-brand/40 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-mist [&_code]:px-1.5 [&_code]:py-0.5 [&_h2]:scroll-mt-24 [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text [&_h3]:scroll-mt-24 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-6 [&_img]:w-full [&_img]:rounded-[20px] [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-mist [&_pre]:p-4 [&_table]:w-full [&_table]:min-w-[560px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_td]:border-b [&_td]:border-border/70 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-semibold [&_th]:text-text [&_thead]:bg-mist [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: post.bodyHtml ?? "" }}
              />
              {post.faq?.length ? (
                <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
                  <h2 className="text-2xl font-semibold tracking-tight text-text">{t.blogPreview.faqTitle}</h2>
                  <dl className="mt-6 space-y-5">
                    {post.faq.map((item) => (
                      <div key={item.question}>
                        <dt className="font-medium text-text">{item.question}</dt>
                        <dd className="mt-2 text-steel">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              {post.internalLinks?.length ? (
                <nav aria-label={t.blogPreview.relatedTitle} className="mt-10">
                  <p className="text-sm font-semibold text-text">{t.blogPreview.relatedTitle}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {post.internalLinks.map((item) => (
                      <li key={`${item.anchor}-${item.url}`}>
                        <Link href={item.url} className="rounded-full bg-mist px-3 py-1.5 text-sm text-steel hover:text-text">
                          {item.anchor}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              {post.tags.length ? (
                <div className="mt-10 flex flex-wrap gap-2">
                  {post.tags.map((tag) => <span key={tag} className="rounded-full bg-mist px-3 py-1.5 text-sm text-steel">{tag}</span>)}
                </div>
              ) : null}
              <AllArticlesLink locale={locale} t={t} />
            </article>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const sections = post.sections ?? post.content.map((paragraph, index) => ({
    id: `section-${index + 1}`,
    title: paragraph.split(/(?<=[.!?])\s/)[0]?.slice(0, 70) ?? `${index + 1}`,
    paragraphs: [paragraph],
  }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: `${SITE_ORIGIN}${post.image}`,
    datePublished: post.publishedAt,
    inLanguage: articleLanguage,
    author: { "@type": "Organization", name: "Genora.art" },
    publisher: { "@type": "Organization", name: "Genora.art", url: SITE_ORIGIN },
    mainEntityOfPage: pageUrl(`/blog/${post.slug}`, localeFromValue(post.language)),
  };
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <ArticleToc
            label={t.blogPreview.sectionsLabel}
            title={t.blogPreview.inThisArticle}
            items={sections}
          />
          <article className="order-1 min-w-0 lg:order-2" lang={articleLanguage}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-[#FF6F00]">{post.topic} · {post.readingMinutes} {t.blogPreview.readTime}</p>
              <ArticleLanguageBadge language={post.language} t={t} />
            </div>
            <time dateTime={post.publishedAt} className="mt-2 block text-sm text-steel">{t.blogPreview.published} {published}</time>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-text sm:text-5xl">{post.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-steel">{post.excerpt}</p>
            <Image src={post.image} alt="" width={960} height={560} priority className="mt-8 aspect-[12/7] w-full rounded-[24px] object-cover" />
            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-2xl font-semibold tracking-tight text-text">{section.title}</h2>
                  <div className="mt-4 space-y-5 text-base leading-8 text-text/85">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full bg-mist px-3 py-1.5 text-sm text-steel">{tag}</span>)}</div>
            <AllArticlesLink locale={locale} t={t} />
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
