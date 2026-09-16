"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminDateRange } from "./admin-date-range";
import { number, td, th } from "./admin-types";

type SearchRow={key:string;clicks:number;impressions:number;ctr:number;position:number};
type GoogleReport={site:string;totals:{clicks:number;impressions:number;ctr:number;position:number};queries:SearchRow[];pages:SearchRow[]};
type YandexRow={key:string;shows:number;clicks:number};
type YandexReport={hostId:string;sqi:number|null;searchablePages:number;excludedPages:number;problems:Record<string,number>;totals:{shows:number;clicks:number};queries:YandexRow[]};
type Source<T>={configured:boolean;data:T|null;error:string|null};
type SeoStats={period:{from:string;to:string};updatedAt:string;google:Source<GoogleReport>&{site:string};yandex:Source<YandexReport>;indexNow:{configured:boolean;keyUrl:string}};

const percent=(value:number)=>`${(value*100).toFixed(2)}%`;
const position=(value:number)=>value?value.toFixed(1):"—";
const problemLabels:Record<string,string>={FATAL:"Критичные",CRITICAL:"Критичные",ERROR:"Ошибки",POSSIBLE_PROBLEM:"Возможные",RECOMMENDATION:"Рекомендации"};
const day=()=>new Date().toISOString().slice(0,10);
const daysAgo=(days:number)=>new Date(Date.now()-days*86400_000).toISOString().slice(0,10);

export function AdminSeo(){
  const [from,setFrom]=useState(daysAgo(28));const [to,setTo]=useState(day());
  const [data,setData]=useState<SeoStats|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
  const [urls,setUrls]=useState("");const [sending,setSending]=useState(false);const [notice,setNotice]=useState<string|null>(null);

  const load=async(options:{refresh?:boolean}={})=>{
    setLoading(true);setError(null);
    const params=new URLSearchParams({from,to});if(options.refresh)params.set("refresh","1");
    const response=await fetch(`/api/admin/seo?${params}`,{cache:"no-store"});
    const payload=await response.json().catch(()=>null) as SeoStats&{error?:string}|null;
    if(response.ok&&payload)setData(payload);else setError(payload?.error??"Не удалось загрузить статистику поиска");
    setLoading(false);
  };

  useEffect(()=>{
    let active=true;
    void fetch(`/api/admin/seo?from=${daysAgo(28)}&to=${day()}`,{cache:"no-store"})
      .then((response)=>response.ok?response.json():null)
      .then((payload:SeoStats|null)=>{if(active&&payload)setData(payload);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);

  const submit=async()=>{
    const list=urls.split(/\s+/).map((item)=>item.trim()).filter(Boolean);
    if(!list.length){setNotice("Вставьте адреса страниц, каждый с новой строки");return;}
    setSending(true);setNotice(null);
    const response=await fetch("/api/admin/seo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({urls:list})});
    const payload=await response.json().catch(()=>null) as {submitted?:number;error?:string}|null;
    setNotice(response.ok?`Отправлено адресов: ${payload?.submitted??0}`:payload?.error??"Не удалось отправить адреса");
    if(response.ok)setUrls("");
    setSending(false);
  };

  if(loading&&!data)return <div className="grid min-h-72 place-items-center"><Loader2 className="size-6 animate-spin text-orange-400"/></div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <AdminDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onApply={()=>void load()} loading={loading}/>
      <div className="flex items-end gap-3">
        {data?<p className="text-[10px] uppercase tracking-wider text-slate-500">Данные от {new Intl.DateTimeFormat("ru-RU",{dateStyle:"short",timeStyle:"short"}).format(new Date(data.updatedAt))}</p>:null}
        <button type="button" disabled={loading} onClick={()=>void load({refresh:true})} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 disabled:opacity-60"><RefreshCw className={cn("size-4",loading&&"animate-spin")}/>Обновить</button>
      </div>
    </div>
    {error?<p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>:null}

    <Card title="Google Search Console" hint={data?.google.site}>
      {!data?.google.configured
        ?<Setup lines={["Доступ к Search Console не настроен.","Создайте сервисный аккаунт в Google Cloud, включите Search Console API и добавьте почту аккаунта пользователем ресурса в Search Console.","Затем задайте на сервере GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL и GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY."]}/>
        :data.google.error
          ?<Problem text={data.google.error}/>
          :data.google.data
            ?<>
              <Metrics items={[["Клики",number(data.google.data.totals.clicks)],["Показы",number(data.google.data.totals.impressions)],["CTR",percent(data.google.data.totals.ctr)],["Средняя позиция",position(data.google.data.totals.position)]]}/>
              <div className="grid gap-4 xl:grid-cols-2">
                <SearchTable caption="Запросы" rows={data.google.data.queries}/>
                <SearchTable caption="Страницы" rows={data.google.data.pages}/>
              </div>
              <p className="text-xs text-slate-500">Google отдаёт данные с задержкой два-три дня, поэтому последние дни периода могут быть пустыми.</p>
            </>
            :null}
    </Card>

    <Card title="Яндекс Вебмастер" hint={data?.yandex.data?.hostId}>
      {!data?.yandex.configured
        ?<Setup lines={["Доступ к Вебмастеру не настроен.","Создайте приложение на oauth.yandex.ru с правом «Яндекс Вебмастер» и получите OAuth-токен владельца сайта.","Затем задайте на сервере YANDEX_WEBMASTER_TOKEN."]}/>
        :data.yandex.error
          ?<Problem text={data.yandex.error}/>
          :data.yandex.data
            ?<>
              <Metrics items={[["ИКС",data.yandex.data.sqi===null?"—":number(data.yandex.data.sqi)],["Страниц в поиске",number(data.yandex.data.searchablePages)],["Исключено страниц",number(data.yandex.data.excludedPages)],["Показы",number(data.yandex.data.totals.shows)],["Клики",number(data.yandex.data.totals.clicks)]]}/>
              {Object.keys(data.yandex.data.problems).length
                ?<div className="flex flex-wrap gap-2">{Object.entries(data.yandex.data.problems).map(([severity,count])=><span key={severity} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">{problemLabels[severity]??severity}: {count}</span>)}</div>
                :<p className="text-xs text-slate-500">Проблем на сайте Вебмастер не показывает.</p>}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead><tr><th className={th}>Запрос</th><th className={th}>Показы</th><th className={th}>Клики</th></tr></thead>
                  <tbody>{data.yandex.data.queries.map((row)=><tr key={row.key}><td className={td}>{row.key}</td><td className={td}>{number(row.shows)}</td><td className={td}>{number(row.clicks)}</td></tr>)}</tbody>
                </table>
                {!data.yandex.data.queries.length?<p className="p-8 text-center text-sm text-slate-500">За период запросов нет</p>:null}
              </div>
            </>
            :null}
    </Card>

    <Card title="Мгновенное уведомление о страницах" hint={data?.indexNow.configured?data.indexNow.keyUrl:undefined}>
      {data?.indexNow.configured
        ?<p className="text-xs text-slate-400">Новые статьи блога уходят в Яндекс и Bing автоматически при публикации. Здесь можно отправить произвольные адреса — например, после правки посадочной страницы. Google этот протокол не поддерживает и берёт страницы из карты сайта.</p>
        :<Setup lines={["Ключ IndexNow не задан, автоматические уведомления отключены.","Задайте на сервере INDEXNOW_KEY: строка из латиницы, цифр и дефисов длиной от 8 символов."]}/>}
      <textarea value={urls} onChange={(event)=>setUrls(event.target.value)} placeholder={"https://genora.art/ru/blog/статья\nhttps://genora.art/en/pricing"} className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 outline-none focus:border-orange-500"/>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={sending||!data?.indexNow.configured} onClick={()=>void submit()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white disabled:opacity-60">{sending?<Loader2 className="size-4 animate-spin"/>:<Send className="size-4"/>}Отправить</button>
        {notice?<p className="text-xs text-orange-300">{notice}</p>:null}
      </div>
    </Card>
  </div>;
}

function Card({title,hint,children}:{title:string;hint?:string;children:ReactNode}){
  return <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
    <header className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">{title}</h2>{hint?<p className="text-[10px] uppercase tracking-wider text-slate-500">{hint}</p>:null}</header>
    {children}
  </section>;
}

function Metrics({items}:{items:Array<[string,string]>}){
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map(([label,value])=><div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>;
}

function SearchTable({caption,rows}:{caption:string;rows:SearchRow[]}){
  return <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
    <table className="w-full min-w-[520px] border-collapse">
      <caption className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">{caption}</caption>
      <thead><tr><th className={th}>Значение</th><th className={th}>Клики</th><th className={th}>Показы</th><th className={th}>CTR</th><th className={th}>Позиция</th></tr></thead>
      <tbody>{rows.map((row)=><tr key={row.key}><td className={cn(td,"max-w-72 truncate")} title={row.key}>{row.key}</td><td className={td}>{number(row.clicks)}</td><td className={td}>{number(row.impressions)}</td><td className={td}>{percent(row.ctr)}</td><td className={td}>{position(row.position)}</td></tr>)}</tbody>
    </table>
    {!rows.length?<p className="p-8 text-center text-sm text-slate-500">За период данных нет</p>:null}
  </div>;
}

function Setup({lines}:{lines:string[]}){
  return <ol className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-100">{lines.map((line)=><li key={line}>{line}</li>)}</ol>;
}

function Problem({text}:{text:string}){
  return <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{text}</p>;
}
