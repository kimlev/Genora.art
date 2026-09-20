import { LegalMarkdownDocument } from "@/components/legal/legal-markdown-document";
import { legalTextLocale, requestLocale } from "@/lib/i18n/request-locale";
import { getLegalDocument, legalDocuments } from "@/lib/legal/documents";
import { pageUrl, SITE_NAME } from "@/lib/seo";
import { IS_STAGING } from "@/lib/site-env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

function legalLanguages(slug: string) {
  return {
    "x-default": pageUrl(`/legal/${slug}`),
    ru: pageUrl(`/legal/${slug}`),
    en: pageUrl(`/legal/${slug}`, "en"),
  };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const document = getLegalDocument(slug);
  if (!document) return {};
  const locale = await requestLocale(lang);
  const english = legalTextLocale(locale) === "en";
  const title = `${english ? document.shortTitleEn : document.shortTitle} — ${SITE_NAME}`;
  const description = english ? document.descriptionEn : document.description;
  const url = pageUrl(`/legal/${slug}`, locale);
  return {
    title,
    description,
    robots: { index: !IS_STAGING, follow: !IS_STAGING },
    alternates: { canonical: url, languages: legalLanguages(slug) },
    openGraph: {
      type: "article",
      locale: english ? "en_US" : "ru_RU",
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
  };
}

export default async function LegalPage({ params, searchParams }: PageProps<"/[locale]/legal/[slug]">) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const document = getLegalDocument(slug);
  if (!document) notFound();
  return <LegalMarkdownDocument slug={slug} locale={await requestLocale(lang)} />;
}
