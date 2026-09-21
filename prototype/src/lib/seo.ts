import { IMAGE_SEO_TECH_RU } from "@/lib/content/image-seo-article-ru";
import { MODELS_SEO_TECH_RU } from "@/lib/content/models-seo-article-ru";
import { VIDEO_SEO_TECH_RU } from "@/lib/content/video-seo-article-ru";
import { logoPageCopy } from "@/lib/i18n/copy/logo-page";
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
  "/logo",
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

const homepageDescriptions: Record<Locale, string> = {
  en: "Bring your ideas to life with powerful AI models for images, music, video, and smart chats — all in one creative workspace.",
  ru: "Воплощай идеи с мощными ИИ-моделями для изображений, музыки, видео и умных чатов — в одном творческом пространстве.",
  hi: "शक्तिशाली AI मॉडलों के साथ इमेज, संगीत, वीडियो और स्मार्ट चैट में अपने विचारों को साकार करें — एक ही रचनात्मक स्थान पर।",
  es: "Convierte tus ideas en imágenes, música, vídeo y chats inteligentes con potentes modelos de IA, todo en un mismo espacio creativo.",
  fr: "Donnez vie à vos idées avec de puissants modèles d’IA pour les images, la musique, la vidéo et les chats intelligents, dans un seul espace créatif.",
  ar: "حوّل أفكارك إلى صور وموسيقى وفيديو ومحادثات ذكية باستخدام نماذج ذكاء اصطناعي قوية في مساحة إبداعية واحدة.",
  pt: "Dê vida às suas ideias com modelos de IA para imagens, música, vídeo e chats inteligentes, tudo em um só espaço criativo.",
  de: "Verwirkliche deine Ideen mit leistungsstarken KI-Modellen für Bilder, Musik, Video und intelligente Chats — in einem kreativen Workspace.",
  ja: "高性能なAIモデルで、画像・音楽・動画・スマートチャットのアイデアをひとつの創作ワークスペースで形に。",
  it: "Trasforma le tue idee con modelli IA per immagini, musica, video e chat intelligenti, tutto in un unico spazio creativo.",
  zh: "用强大的 AI 模型把创意变成图像、音乐、视频和智能对话，尽在一个创作空间。",
  tr: "Güçlü yapay zekâ modelleriyle fikirlerini görsellere, müziğe, videoya ve akıllı sohbetlere dönüştür — tek yaratıcı alanda.",
  pl: "Realizuj pomysły dzięki modelom AI do obrazów, muzyki, wideo i inteligentnych rozmów — w jednej kreatywnej przestrzeni.",
  sv: "Förverkliga dina idéer med kraftfulla AI-modeller för bilder, musik, video och smarta chattar i en kreativ arbetsyta.",
  cs: "Proměňte své nápady v obrázky, hudbu, video a chytré chaty s výkonnými AI modely v jednom kreativním prostoru.",
  nl: "Breng ideeën tot leven met krachtige AI-modellen voor beelden, muziek, video en slimme chats in één creatieve werkruimte.",
  el: "Μετέτρεψε τις ιδέες σου σε εικόνες, μουσική, βίντεο και έξυπνες συνομιλίες με ισχυρά μοντέλα AI σε έναν δημιουργικό χώρο.",
  ko: "강력한 AI 모델로 이미지, 음악, 영상과 스마트 채팅 아이디어를 하나의 창작 공간에서 실현하세요.",
  ro: "Dă viață ideilor tale cu modele AI puternice pentru imagini, muzică, video și chat inteligent, într-un singur spațiu creativ.",
};

export function seoCopy(path: string, locale: Locale): { title: string; description: string } {
  const t = getDictionary(locale);
  const brand = t.brand;
  switch (path) {
    case "/":
      return {
        title: `${t.hero.titleBefore}${t.hero.titleAccent}${t.hero.titleAfter} — ${brand}`.replace(/\s+/g, " ").trim(),
        description: homepageDescriptions[locale],
      };
    case "/agents":
      return { title: `${t.agents.catalogTitle} — ${brand}`, description: t.agents.catalogSubtitle };
    case "/pricing":
      return { title: t.pricingPage.metaTitle, description: t.pricingPage.metaDescription };
    case "/about":
      return { title: `${t.legal.aboutTitle} — ${brand}`, description: t.legal.aboutSections[0]?.body ?? t.why.subtitle };
    case "/logo": {
      const logo = logoPageCopy(locale);
      return { title: `${logo.title} — ${brand}`, description: logo.description };
    }
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
      images: [{
        url: publicSiteUrl("/favicon/icon-512.png"),
        width: 512,
        height: 512,
        alt: SITE_NAME,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [publicSiteUrl("/favicon/icon-512.png")],
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
