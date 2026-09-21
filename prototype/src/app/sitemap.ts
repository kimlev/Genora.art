import { getBlogPosts } from "@/lib/blog/posts-query";
import { legalDocuments } from "@/lib/legal/documents";
import { languageAlternates, localeFromValue, pageUrl, PUBLIC_INDEX_PATHS } from "@/lib/seo";
import { localeOptions } from "@/lib/i18n";
import type { MetadataRoute } from "next";

/**
 * Карта сайта собирается на каждый запрос: при сборке образа базы нет,
 * и статичный файл попадал в поисковики со списком демонстрационных статей.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dev also needs a complete URL inventory for direct analysis. Public crawlers
  // may read it, while X-Robots-Tag and page metadata prevent dev indexing.
  // Демонстрационные статьи существуют только при пустой базе и в поиске отдавали бы 404.
  const posts = (await getBlogPosts()).filter((post) => post.source !== "static");
  return [
    ...PUBLIC_INDEX_PATHS.flatMap((path) =>
      localeOptions.map((option) => ({
        url: pageUrl(path, option.code),
        lastModified: new Date(),
        changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
        priority: path === "/" ? 1 : 0.7,
        alternates: { languages: languageAlternates(path) },
      })),
    ),
    // Legal documents have only Russian and English texts. Other UI locales
    // display the English fallback, so don't advertise them as translations.
    ...legalDocuments.flatMap((document) =>
      (["ru", "en"] as const).map((locale) => ({
        url: pageUrl(`/legal/${document.slug}`, locale),
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.3,
        alternates: {
          languages: {
            "x-default": pageUrl(`/legal/${document.slug}`),
            ru: pageUrl(`/legal/${document.slug}`),
            en: pageUrl(`/legal/${document.slug}`, "en"),
          },
        },
      })),
    ),
    ...posts.map((post) => ({
      url: pageUrl(`/blog/${post.slug}`, localeFromValue(post.language)),
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
