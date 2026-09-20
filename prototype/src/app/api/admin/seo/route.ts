import { requireAdmin } from "@/lib/server/admin-session";
import { jsonError } from "@/lib/server/http";
import { submitToIndexNow } from "@/lib/server/indexnow";
import { seoStats } from "@/lib/server/seo-stats";
import { IS_STAGING } from "@/lib/site-env";

export const runtime="nodejs";

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_MANUAL_URLS=50;

export async function GET(request:Request) {
  try {
    await requireAdmin();
    const url=new URL(request.url);
    const from=url.searchParams.get("from")||new Date(Date.now()-28*86400_000).toISOString().slice(0,10);
    const to=url.searchParams.get("to")||new Date().toISOString().slice(0,10);
    if(!DATE.test(from)||!DATE.test(to)||from>to) return jsonError("Некорректный период");
    return Response.json(await seoStats(from,to,url.searchParams.get("refresh")==="1"));
  } catch(error) {
    if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);
    console.error("admin_seo_failed",error);
    return jsonError("Не удалось загрузить статистику поиска",500);
  }
}

/** Ручная отправка адресов в IndexNow: нужна, когда страницу правили вне публикации статьи */
export async function POST(request:Request) {
  try {
    await requireAdmin();
    if (IS_STAGING) return jsonError("Отправка адресов в поисковые системы доступна только на production",403);
    const body=await request.json().catch(()=>null) as {urls?:unknown}|null;
    const urls=Array.isArray(body?.urls)?body.urls.filter((item):item is string=>typeof item==="string"&&item.trim().length>0):[];
    if(!urls.length) return jsonError("Укажите хотя бы один адрес");
    if(urls.length>MAX_MANUAL_URLS) return jsonError(`За один раз можно отправить не больше ${MAX_MANUAL_URLS} адресов`);
    const result=await submitToIndexNow(urls.map((item)=>item.trim()));
    if(result.reason==="not-configured") return jsonError("Ключ IndexNow не задан на сервере",503);
    if(result.reason==="no-urls") return jsonError("Ни один адрес не относится к нашему сайту");
    if(result.reason) return jsonError("Поисковик не принял адреса, подробности в журнале сервера",502);
    return Response.json({submitted:result.submitted});
  } catch(error) {
    if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);
    console.error("admin_indexnow_failed",error);
    return jsonError("Не удалось отправить адреса",500);
  }
}
