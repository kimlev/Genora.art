import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/video-examples", await requestLocale((await params).locale));
}

export default async function VideoExamplesRoute({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return <BlogoroSeoArticleSlot pagePath="/video-examples" articleId="videos" locale={locale} />;
}
