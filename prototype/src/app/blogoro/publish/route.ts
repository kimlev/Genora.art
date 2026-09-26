import { blogIndexUrl, isBlogoroWebhookTest, parseBlogoroPayload, publishBlogoroArticle, BlogoroPublishError } from "@/lib/server/blogoro-publish";
import {
  BLOGORO_PAGE_SECTION_CAPABILITY,
  BLOGORO_PAGE_SECTION_EVENT,
  publishBlogoroPageSection,
  type BlogoroPageSectionPayload,
} from "@/lib/server/blogoro-page-sections";
import { blogoroWebhookSecret, verifyBlogoroSignature } from "@/lib/server/blogoro-signature";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { IS_STAGING, publicSiteUrl } from "@/lib/site-env";
import { submitPageForIndexing } from "@/lib/server/search-submit";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BLOGORO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const secret = blogoroWebhookSecret();
  if (!secret) return Response.json({ error: "Приёмник не настроен" }, { status: 503 });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BLOGORO_BYTES) {
    return Response.json({ error: "Пакет публикации слишком большой" }, { status: 413 });
  }
  const signature = request.headers.get("x-blogoro-signature");
  if (!verifyBlogoroSignature(rawBody, signature, secret)) {
    const looksTruncated = rawBody.length >= 10 * 1024 * 1024 && !/"\s*}\s*$/.test(rawBody);
    console.error("blogoro_publish_signature_failed", { bytes: rawBody.length, hasSignature: Boolean(signature), looksTruncated });
    if (looksTruncated) {
      return Response.json({ error: "Статья слишком большая: приёмник получил неполное тело запроса" }, { status: 413 });
    }
    return Response.json({ error: "Неверная подпись" }, { status: 401 });
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return Response.json({ error: "Некорректный пакет" }, { status: 422 });
    }
    const payload = parsed as BlogoroPageSectionPayload;
    const eventHeader = request.headers.get("x-blogoro-event");
    if (eventHeader !== payload.event) {
      return Response.json({ error: "Событие в заголовке и пакете не совпадает" }, { status: 422 });
    }
    if (isBlogoroWebhookTest(payload)) {
      return Response.json({ ok: true, capabilities: [BLOGORO_PAGE_SECTION_CAPABILITY] });
    }
    if (payload.event === BLOGORO_PAGE_SECTION_EVENT) {
      const published = await publishBlogoroPageSection(
        payload,
        request.headers.get("x-blogoro-idempotency-key") ?? "",
      );
      revalidatePath(withLocalePath(published.pagePath, published.locale));
      revalidatePath("/sitemap.xml");
      const submitted = IS_STAGING
        ? []
        : await submitPageForIndexing(published.receipt.url, published.locale);
      console.info("blogoro_page_section_indexing", {
        url: published.receipt.url,
        locale: published.locale,
        submitted,
        skippedOnDev: IS_STAGING,
      });
      return Response.json({
        ...published.receipt,
        sitemap: publicSiteUrl("/sitemap.xml"),
        indexing: submitted,
      });
    }
    const published = await publishBlogoroArticle(parseBlogoroPayload(payload));
    revalidateTag("blogoro-posts", "max");
    // Страницы блога живут внутри языкового сегмента, поэтому сбрасываем маршрут, а не один адрес
    revalidatePath("/[locale]/blog", "page");
    revalidatePath("/[locale]/blog/[slug]", "page");
    revalidatePath("/sitemap.xml");
    // Dev only refreshes its own sitemap; search-engine notifications belong to production.
    const submitted = IS_STAGING
      ? []
      : await submitPageForIndexing(published.url, published.locale, [blogIndexUrl(published.locale)]);
    console.info("blogoro_publish_indexing", { url: published.url, locale: published.locale, submitted, skippedOnDev: IS_STAGING });
    return Response.json({
      url: published.url,
      slug: published.slug,
      locale: published.locale,
      sitemap: publicSiteUrl("/sitemap.xml"),
      indexing: submitted,
    });
  } catch (error) {
    if (error instanceof BlogoroPublishError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    console.error("blogoro_publish_failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Не удалось опубликовать статью" }, { status: 500 });
  }
}
