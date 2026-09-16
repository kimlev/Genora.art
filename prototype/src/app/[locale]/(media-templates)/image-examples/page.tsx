import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { CatalogFooterCta } from "@/components/catalog/catalog-footer-cta";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/image-examples", await requestLocale((await params).locale));
}

export default async function ImageExamplesRoute({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return (
    <>
      <BlogoroSeoArticleSlot pagePath="/image-examples" articleId="images" locale={locale} />
      <CatalogFooterCta section="images" />
    </>
  );
}
