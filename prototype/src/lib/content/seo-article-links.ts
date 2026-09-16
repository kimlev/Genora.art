import type { Locale } from "@/lib/i18n";

export function articleHeadingId(heading: string): string {
  return heading
    .trim()
    .toLocaleLowerCase("ru")
    .replace(/[«»“”„"'’`]/g, "")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function localizeArticleHref(href: string, locale: Locale): string {
  if (href.startsWith("#") || href.startsWith("/")) return href;
  try {
    const url = new URL(href);
    if (url.hostname !== "genora.art" && url.hostname !== "www.genora.art") return href;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0]?.length === 2) segments.shift();
    return `/${locale}${segments.length ? `/${segments.join("/")}` : ""}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
