import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { CatalogFooterCta } from "@/components/catalog/catalog-footer-cta";
import { ModelsCatalogPage } from "@/components/catalog/models-catalog-page";
import { SiteFooter } from "@/components/layout/site-footer";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/models", await requestLocale((await params).locale));
}

export default async function ModelsPage({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return (
    <>
      <main className="flex-1">
        <ModelsCatalogPage />
        <BlogoroSeoArticleSlot pagePath="/models" articleId="models" locale={locale} />
      </main>
      <CatalogFooterCta section="models" />
      <SiteFooter />
    </>
  );
}
