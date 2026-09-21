import { IMAGE_SEO_TECH_RU } from "@/lib/content/image-seo-article-ru";
import { MODELS_SEO_TECH_RU } from "@/lib/content/models-seo-article-ru";
import { VIDEO_SEO_TECH_RU } from "@/lib/content/video-seo-article-ru";
import { defaultLocale, getDictionary, getLocaleOption, isLocale, localeOptions, type Locale } from "@/lib/i18n";
import { catalogPagesCopy } from "@/lib/i18n/copy/catalog-pages";
import { musicStudioCopy } from "@/lib/i18n/copy/music-page";
import { songsPageLandingCopy } from "@/lib/i18n/copy/songs-page-landing-copy";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { IS_STAGING, SITE_ORIGIN as ENV_SITE_ORIGIN, localeCookieName, publicSiteUrl } from "@/lib/site-env";
import type { Metadata } from "next";

export const SITE_ORIGIN = ENV_SITE_ORIGIN;
export const SITE_NAME = IS_STAGING ? "Genora (dev)" : "Genora.art";
export const LOCALE_COOKIE = localeCookieName();
export const LOCALE_QUERY = "lang";
export const LOCALE_HEADER = "x-genora-locale";

export const PUBLIC_INDEX_PATHS = [
  "/",
  "/pricing",
  "/create-foto-video",
  "/models",
  "/image-examples",
  "/music",
  "/songs",
  "/video-examples",
  "/agents",
  "/blog",
  "/rating",
  "/support",
  "/about",
] as const;

export function localeFromValue(value?: string | null): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

export function pageUrl(path: string, locale: Locale = defaultLocale): string {
  const normalized = path === "" ? "/" : path;
  return publicSiteUrl(withLocalePath(normalized, locale));
}

export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = { "x-default": pageUrl(path, defaultLocale) };
  for (const option of localeOptions) languages[option.code] = pageUrl(path, option.code);
  return languages;
}

export function seoCopy(path: string, locale: Locale): { title: string; description: string } {
  const t = getDictionary(locale);
  const brand = t.brand;
  switch (path) {
    case "/":
      return {
        title: `${t.hero.titleBefore}${t.hero.titleAccent}${t.hero.titleAfter} — ${brand}`.replace(/\s+/g, " ").trim(),
        description: `${t.hero.badge}. ${t.why.subtitle}. ${t.hero.trust}`,
      };
    case "/agents":
      return { title: `${t.agents.catalogTitle} — ${brand}`, description: t.agents.catalogSubtitle };
    case "/pricing":
      return { title: t.pricingPage.metaTitle, description: t.pricingPage.metaDescription };
    case "/about":
      return { title: `${t.legal.aboutTitle} — ${brand}`, description: t.legal.aboutSections[0]?.body ?? t.why.subtitle };
    case "/rating":
      return { title: `${t.rating.pageTitle} — ${brand}`, description: t.rating.pageSubtitle };
    case "/gallery":
      return { title: `${t.workspace.menuGallery} — ${brand}`, description: t.workspace.galleryEmpty };
    case "/video-examples":
      return locale === "ru"
        ? { title: `${VIDEO_SEO_TECH_RU.title} — ${brand}`, description: VIDEO_SEO_TECH_RU.description }
        : { title: `${t.workspace.videoTemplatesTitle} — ${brand}`, description: t.workspace.videoTemplatesLead };
    case "/support":
      return { title: `${t.support.title} — ${brand}`, description: t.support.subtitle };
    case "/images":
    case "/create-foto-video":
      return { title: `${t.imageLanding.title} — ${brand}`, description: t.imageLanding.subtitle };
    case "/models": {
      if (locale === "ru") {
        return { title: `${MODELS_SEO_TECH_RU.title} — ${brand}`, description: MODELS_SEO_TECH_RU.description };
      }
      const catalog = catalogPagesCopy(locale);
      return { title: `${catalog.modelsTitle} — ${brand}`, description: catalog.modelsLead };
    }
    case "/image-examples": {
      if (locale === "ru") {
        return { title: `${IMAGE_SEO_TECH_RU.title} — ${brand}`, description: IMAGE_SEO_TECH_RU.description };
      }
      const catalog = catalogPagesCopy(locale);
      return { title: `${catalog.imagesTitle} — ${brand}`, description: catalog.imagesLead };
    }
    case "/music":
      return { title: `${t.workspace.menuAudio} — ${brand}`, description: t.workspace.menuAudio };
    case "/songs": {
      const landing = songsPageLandingCopy(locale);
      return { title: `${landing.seoTitle} — ${brand}`, description: landing.seoDescription };
    }
    case "/blog":
      return { title: `${t.blogPreview.title} — ${brand}`, description: t.blogPreview.eyebrow };
    default:
      return {
        title: `${brand} — ${t.hero.titleAccent}`,
        description: t.why.subtitle,
      };
  }
}

export function publicPageMetadata(path: string, lang?: string | null): Metadata {
  const locale = localeFromValue(lang);
  const copy = seoCopy(path, locale);
  const url = pageUrl(path, locale);
  return {
    title: { absolute: copy.title },
    description: copy.description,
    robots: IS_STAGING ? { index: false, follow: false } : { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      locale: getLocaleOption(locale).intl.replace("-", "_"),
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export function siteJsonLd(locale: Locale) {
  const option = getLocaleOption(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/favicon/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: SITE_NAME,
        inLanguage: option.intl,
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}
