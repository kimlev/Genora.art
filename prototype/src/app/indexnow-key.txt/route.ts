import { indexNowKey } from "@/lib/server/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Поисковик скачивает ключ с сайта и только после этого принимает от нас список адресов */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
