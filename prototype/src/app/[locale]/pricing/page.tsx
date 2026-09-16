import { BlogoroSeoArticleSlot } from "@/components/catalog/blogoro-seo-article-slot";
import { PricingPageContent } from "@/components/pricing/pricing-page-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { requestLocale } from "@/lib/i18n/request-locale";
import { blogoroPageMetadata } from "@/lib/server/blogoro-page-sections";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogoroPageMetadata("/pricing", await requestLocale((await params).locale));
}

export default async function PricingPage({ params }: Props) {
  const locale = await requestLocale((await params).locale);
  return (
    <>
      <main className="flex-1">
        <PricingPageContent articleSlot={<BlogoroSeoArticleSlot pagePath="/pricing" articleId="pricing" locale={locale} />} />
      </main>
      <SiteFooter />
    </>
  );
}
