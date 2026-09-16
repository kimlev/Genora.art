import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { SiteFooter } from "@/components/layout/site-footer";
import { MusicGuideCta } from "@/components/music/music-guide-sections";
import { MusicPublicPage } from "@/components/music/music-public-page";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/songs", await requestLocale((await params).locale));
}

export default async function SongsPage({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return (
    <>
      <main className="flex-1">
        <MusicPublicPage />
        <BlogoroSeoArticleSlot pagePath="/songs" articleId="songs" locale={locale} />
        <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-8 sm:pb-16">
          <MusicGuideCta />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
