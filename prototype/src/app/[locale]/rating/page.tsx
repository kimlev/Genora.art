import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { SiteFooter } from "@/components/layout/site-footer";
import { RatingPageContent } from "@/components/rating/rating-page-content";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/rating", await requestLocale((await params).locale));
}

export default async function RatingPage({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return (
    <>
      <main className="flex-1">
        <RatingPageContent articleSlot={<BlogoroSeoArticleSlot pagePath="/rating" articleId="rating" locale={locale} />} />
      </main>
      <SiteFooter />
    </>
  );
}
