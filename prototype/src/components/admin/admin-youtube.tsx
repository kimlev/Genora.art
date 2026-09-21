"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, CheckCircle2, Clock, ExternalLink, Link2, Loader2, Play, RefreshCw, Save, ShieldCheck, Unplug, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export type YoutubeAdminSection = "youtube-connect" | "youtube-research" | "youtube-plan" | "youtube-script" | "youtube-package" | "youtube-production" | "youtube-publish" | "youtube-analytics";
type Stage = "research" | "plan" | "script" | "package" | "production" | "publish" | "analytics";

type Settings = {
  channelId: string | null;
  channelTitle: string | null;
  channelHandle: string | null;
  connected: boolean;
  tokenExpiresAt: string | null;
  scopes: string[];
  aiProvider: string;
  aiModel: string;
  defaultLanguage: string;
  defaultPrivacy: "private" | "unlisted" | "public";
  defaultCategoryId: string;
  timezone: string;
  researchQueries: string[];
  automationEnabled: boolean;
  researchIntervalHours: number;
  analyticsIntervalHours: number;
  nextResearchAt: string | null;
  nextAnalyticsAt: string | null;
};

type Run = { id:string;stage:Stage;status:string;input:Record<string,unknown>;output:Record<string,unknown>;error:string|null;startedAt:string;completedAt:string|null };
type Project = {
  id:string;title:string;topic:string;targetAudience:string;goal:string;language:string;status:string;currentStage:Stage|"done";
  videoAssetId:string|null;scheduledAt:string|null;publishApprovedAt:string|null;publishedVideoId:string|null;publishedUrl:string|null;
  metadata:Record<string,unknown>;createdAt:string;updatedAt:string;runs:Run[];
};
type Workspace = {
  settings:Settings;
  requirements:{oauthConfigured:boolean;apiKeyConfigured:boolean;integratorConfigured:boolean;workerConfigured:boolean;redirectUri:string|null;scopes:string[];requiredEnvironment:string[]};
  projects:Project[];
  videoAssets:Array<{id:string;mime:string;bytes:number}>;
  stages:Stage[];
};
type ProjectForm={title:string;topic:string;targetAudience:string;goal:string;language:string;videoAssetId:string;scheduledAt:string;youtubeTitle:string;description:string;tags:string;thumbnailBrief:string;privacyStatus:string;categoryId:string};

const SECTION_STAGE:Partial<Record<YoutubeAdminSection,Stage>>={
  "youtube-research":"research","youtube-plan":"plan","youtube-script":"script","youtube-package":"package",
  "youtube-production":"production","youtube-publish":"publish","youtube-analytics":"analytics",
};
const STAGE_SECTION:Record<Stage,YoutubeAdminSection>={
  research:"youtube-research",plan:"youtube-plan",script:"youtube-script",package:"youtube-package",
  production:"youtube-production",publish:"youtube-publish",analytics:"youtube-analytics",
};
const STAGE_LABEL:Record<Stage,string>={research:"Исследование",plan:"Контент-план",script:"Сценарий",package:"Название и упаковка",production:"Производство",publish:"Публикация",analytics:"Аналитика"};
const STAGE_HINT:Record<Stage,string>={
  research:"Тренды, конкуренты, outliers и свободные темы.",
  plan:"Один реализуемый выпуск: обещание, аудитория, структура и Shorts.",
  script:"Пять hooks, выбранное вступление, сценарий и retention beats.",
  package:"Title, description, tags, chapters и thumbnail brief как единая упаковка.",
  production:"Shot list, монтажный план, Shorts и выбор готового видео Genora.",
  publish:"Финальная проверка, ручное подтверждение, upload или расписание YouTube.",
  analytics:"Метрики YouTube Analytics за 28 дней и следующий цикл улучшений.",
};
const inputClass="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500";
const primaryButton="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-50";
const secondaryButton="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 disabled:opacity-50";

function asString(value:unknown){return typeof value==="string"?value:"";}
function localDateTime(value:string|null){return value?new Date(value).toISOString().slice(0,16):"";}
function fileSize(value:number){return value>1024*1024?`${(value/1024/1024).toFixed(1)} МБ`:`${Math.ceil(value/1024)} КБ`;}
function projectFormFrom(project:Project):ProjectForm{return {
  title:project.title,topic:project.topic,targetAudience:project.targetAudience,goal:project.goal,language:project.language,
  videoAssetId:project.videoAssetId??"",scheduledAt:localDateTime(project.scheduledAt),youtubeTitle:asString(project.metadata.title),
  description:asString(project.metadata.description),tags:Array.isArray(project.metadata.tags)?project.metadata.tags.join(", "):"",
  thumbnailBrief:asString(project.metadata.thumbnailBrief),privacyStatus:asString(project.metadata.privacyStatus)||"private",categoryId:asString(project.metadata.categoryId)||"28",
};}

export function AdminYoutube({section,onNavigate}:{section:YoutubeAdminSection;onNavigate:(section:YoutubeAdminSection)=>void}){
  const [data,setData]=useState<Workspace|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null);
  const [selectedId,setSelectedId]=useState<string>("");
  const [settings,setSettings]=useState<Settings|null>(null);
  const [draft,setDraft]=useState({title:"",topic:"",targetAudience:"",goal:"",language:"ru"});
  const [projectForm,setProjectForm]=useState({title:"",topic:"",targetAudience:"",goal:"",language:"ru",videoAssetId:"",scheduledAt:"",youtubeTitle:"",description:"",tags:"",thumbnailBrief:"",privacyStatus:"private",categoryId:"28"});

  const apply=(payload:Workspace)=>{
    setData(payload);setSettings(payload.settings);
    const nextId=selectedId&&payload.projects.some((item)=>item.id===selectedId)?selectedId:payload.projects[0]?.id??"";
    const nextProject=payload.projects.find((item)=>item.id===nextId);
    setSelectedId(nextId);if(nextProject)setProjectForm(projectFormFrom(nextProject));
  };
  const load=async()=>{
    setLoading(true);setError(null);
    const response=await fetch("/api/admin/youtube",{cache:"no-store"});
    const payload=await response.json().catch(()=>null) as Workspace&{error?:string}|null;
    if(response.ok&&payload)apply(payload);else setError(payload?.error??"Не удалось загрузить YouTube workspace");
    setLoading(false);
  };
  useEffect(()=>{
    let active=true;
    void fetch("/api/admin/youtube",{cache:"no-store"}).then(async(response)=>{
      const payload=await response.json().catch(()=>null) as Workspace&{error?:string}|null;
      if(!active)return;
      if(response.ok&&payload){
        setData(payload);setSettings(payload.settings);
        const first=payload.projects[0];setSelectedId(first?.id??"");if(first)setProjectForm(projectFormFrom(first));
      }else setError(payload?.error??"Не удалось загрузить YouTube workspace");
    }).catch((caught)=>{if(active)setError(caught instanceof Error?caught.message:"Не удалось загрузить YouTube workspace");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);

  const selected=useMemo(()=>data?.projects.find((item)=>item.id===selectedId)??null,[data,selectedId]);
  const selectProject=(id:string)=>{setSelectedId(id);const project=data?.projects.find((item)=>item.id===id);if(project)setProjectForm(projectFormFrom(project));};

  const call=async(body:Record<string,unknown>,success:string)=>{
    setBusy(true);setError(null);setNotice(null);
    try{
      const response=await fetch("/api/admin/youtube",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json().catch(()=>null) as (Workspace&{error?:string;url?:string})|null;
      if(!response.ok||!payload)throw new Error(payload?.error??"Операция не выполнена");
      if(payload.url)return payload;
      apply(payload);setNotice(success);return payload;
    }catch(caught){setError(caught instanceof Error?caught.message:"Операция не выполнена");return null;}
    finally{setBusy(false);}
  };
  const saveSettings=async()=>{
    if(!settings)return;
    setBusy(true);setError(null);setNotice(null);
    const response=await fetch("/api/admin/youtube",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(settings)});
    const payload=await response.json().catch(()=>null) as Workspace&{error?:string}|null;
    if(response.ok&&payload){apply(payload);setNotice("Настройки сохранены");}else setError(payload?.error??"Не удалось сохранить настройки");
    setBusy(false);
  };
  const connect=async()=>{const payload=await call({action:"oauth-start"},"");if(payload?.url)window.location.assign(payload.url);};
  const createProject=async()=>{
    const payload=await call({action:"create-project",...draft},"Проект создан");
    if(payload){const newest=payload.projects[0];if(newest){setSelectedId(newest.id);setDraft({title:"",topic:"",targetAudience:"",goal:"",language:payload.settings.defaultLanguage});}}
  };
  const saveProject=async(showNotice=true)=>{
    if(!selected)return null;
    return call({action:"save-project",projectId:selected.id,...projectForm,tags:projectForm.tags.split(",").map((item)=>item.trim()).filter(Boolean),scheduledAt:projectForm.scheduledAt?new Date(projectForm.scheduledAt).toISOString():null},showNotice?"Проект сохранён":"");
  };
  const runStage=async(stage:Stage)=>{
    if(!selected)return;
    const saved=await saveProject(false);if(!saved)return;
    const payload=await call({action:"run-stage",projectId:selected.id,stage},`${STAGE_LABEL[stage]} завершён`);
    if(payload){const next=payload.projects.find((item)=>item.id===selected.id)?.currentStage;if(next&&next!=="done")onNavigate(STAGE_SECTION[next]);}
  };

  if(loading&&!data)return <div className="grid min-h-72 place-items-center"><Loader2 className="size-6 animate-spin text-orange-400"/></div>;
  if(!data||!settings)return <Message tone="error">{error??"YouTube workspace недоступен"}</Message>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-red-500/15 text-red-300"><Video className="size-5"/></span><div><h2 className="font-semibold">YouTube Genora</h2><p className="text-xs text-slate-500">Последовательный production workflow с ручным контролем публикации</p></div></div>
      <div className="flex items-center gap-2"><Status ok={settings.connected} label={settings.connected?settings.channelTitle||"Канал подключён":"Канал не подключён"}/><button type="button" onClick={()=>void load()} className="grid size-9 place-items-center rounded-xl border border-slate-700 text-slate-300"><RefreshCw className="size-4"/></button></div>
    </div>
    {error?<Message tone="error">{error}</Message>:null}{notice?<Message>{notice}</Message>:null}
    {section==="youtube-connect"?<Connection settings={settings} setSettings={setSettings} requirements={data.requirements} busy={busy} onSave={()=>void saveSettings()} onConnect={()=>void connect()} onDisconnect={()=>void call({action:"disconnect"},"Канал отключён")} onNext={()=>onNavigate("youtube-research")}/>:<>
      <ProjectBar projects={data.projects} selectedId={selectedId} onSelect={selectProject}/>
      {!selected?<NewProject draft={draft} setDraft={setDraft} busy={busy} onCreate={()=>void createProject()}/>:<StageView stage={SECTION_STAGE[section]??"research"} project={selected} form={projectForm} setForm={setProjectForm} assets={data.videoAssets} busy={busy} onSave={()=>void saveProject()} onRun={(stage)=>void runStage(stage)} onApprove={()=>void call({action:"approve-publish",projectId:selected.id},"Публикация подтверждена")}/>}
    </>}
    {busy?<div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/35"><div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm"><Loader2 className="size-5 animate-spin text-orange-400"/>Выполняется этап YouTube…</div></div>:null}
  </div>;
}

function Connection({settings,setSettings,requirements,busy,onSave,onConnect,onDisconnect,onNext}:{settings:Settings;setSettings:(value:Settings)=>void;requirements:Workspace["requirements"];busy:boolean;onSave:()=>void;onConnect:()=>void;onDisconnect:()=>void;onNext:()=>void}){
  const set=<K extends keyof Settings>(key:K,value:Settings[K])=>setSettings({...settings,[key]:value});
  return <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
    <Card title="Подключение канала" icon={<Link2 className="size-4"/>}>
      <div className="grid gap-3 sm:grid-cols-2"><Requirement label="YouTube Data API key" ok={requirements.apiKeyConfigured}/><Requirement label="Google OAuth client" ok={requirements.oauthConfigured}/><Requirement label="IntegratorAI" ok={requirements.integratorConfigured}/><Requirement label="Automation worker" ok={requirements.workerConfigured}/></div>
      {requirements.redirectUri?<Field label="OAuth redirect URI"><CopyValue value={requirements.redirectUri}/></Field>:null}
      <Field label="OAuth scopes"><div className="space-y-1 text-[11px] text-slate-400">{requirements.scopes.map((scope)=><p key={scope} className="break-all">{scope}</p>)}</div></Field>
      <div className="flex flex-wrap gap-2">{settings.connected?<button type="button" disabled={busy} onClick={onDisconnect} className={secondaryButton}><Unplug className="size-4"/>Отключить</button>:<button type="button" disabled={busy||!requirements.oauthConfigured} onClick={onConnect} className={primaryButton}><Video className="size-4"/>Подключить Google / YouTube</button>}<button type="button" onClick={onNext} className={secondaryButton}>Перейти к исследованию</button></div>
      {!requirements.oauthConfigured?<Setup lines={requirements.requiredEnvironment}/>:null}
    </Card>
    <Card title="Skills и автоматизация" icon={<Bot className="size-4"/>}>
      <div className="grid gap-3 sm:grid-cols-2"><Input label="AI provider" value={settings.aiProvider} onChange={(value)=>set("aiProvider",value)} placeholder="openai"/><Input label="AI model" value={settings.aiModel} onChange={(value)=>set("aiModel",value)} placeholder="точный id из IntegratorAI"/><Input label="Язык" value={settings.defaultLanguage} onChange={(value)=>set("defaultLanguage",value)}/><Input label="Категория YouTube" value={settings.defaultCategoryId} onChange={(value)=>set("defaultCategoryId",value)}/><Input label="Часовой пояс" value={settings.timezone} onChange={(value)=>set("timezone",value)}/><Select label="Privacy по умолчанию" value={settings.defaultPrivacy} onChange={(value)=>set("defaultPrivacy",value as Settings["defaultPrivacy"])} options={[["private","Private"],["unlisted","Unlisted"],["public","Public"]]}/></div>
      <Field label="Темы автоматического research"><textarea value={settings.researchQueries.join("\n")} onChange={(event)=>set("researchQueries",event.target.value.split("\n").map((item)=>item.trim()).filter(Boolean))} className={cn(inputClass,"min-h-24")} placeholder="AI video generators\nгенеративное искусство"/></Field>
      <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"><input type="checkbox" checked={settings.automationEnabled} onChange={(event)=>set("automationEnabled",event.target.checked)}/><span><b className="block text-slate-200">Фоновая автоматизация</b><span className="text-slate-500">Research, план и обновление аналитики по расписанию</span></span></label>
      <div className="grid gap-3 sm:grid-cols-2"><NumberInput label="Research каждые, часов" value={settings.researchIntervalHours} onChange={(value)=>set("researchIntervalHours",value)}/><NumberInput label="Analytics каждые, часов" value={settings.analyticsIntervalHours} onChange={(value)=>set("analyticsIntervalHours",value)}/></div>
      <button type="button" disabled={busy} onClick={onSave} className={primaryButton}><Save className="size-4"/>Сохранить настройки</button>
    </Card>
  </div>;
}

function ProjectBar({projects,selectedId,onSelect}:{projects:Project[];selectedId:string;onSelect:(value:string)=>void}){
  return <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4"><label className="min-w-72 flex-1 text-xs text-slate-500">Проект<select value={selectedId} onChange={(event)=>onSelect(event.target.value)} className={cn(inputClass,"mt-1 h-10")}>{projects.map((project)=><option key={project.id} value={project.id}>{project.title} · {project.status}</option>)}</select></label><p className="text-xs text-slate-500">Нет проекта? Создайте его на этапе «Исследование».</p></div>;
}

function NewProject({draft,setDraft,busy,onCreate}:{draft:{title:string;topic:string;targetAudience:string;goal:string;language:string};setDraft:(value:typeof draft)=>void;busy:boolean;onCreate:()=>void}){
  const set=(key:keyof typeof draft,value:string)=>setDraft({...draft,[key]:value});
  return <Card title="Новый YouTube-проект" icon={<Play className="size-4"/>}><div className="grid gap-3 sm:grid-cols-2"><Input label="Рабочее название" value={draft.title} onChange={(value)=>set("title",value)}/><Input label="Язык" value={draft.language} onChange={(value)=>set("language",value)}/></div><Field label="Тема"><textarea className={cn(inputClass,"min-h-24")} value={draft.topic} onChange={(event)=>set("topic",event.target.value)}/></Field><div className="grid gap-3 sm:grid-cols-2"><Input label="Целевая аудитория" value={draft.targetAudience} onChange={(value)=>set("targetAudience",value)}/><Input label="Цель выпуска" value={draft.goal} onChange={(value)=>set("goal",value)}/></div><button type="button" disabled={busy||!draft.title||!draft.topic} onClick={onCreate} className={primaryButton}><Play className="size-4"/>Создать и начать research</button></Card>;
}

function StageView({stage,project,form,setForm,assets,busy,onSave,onRun,onApprove}:{stage:Stage;project:Project;form:ProjectForm;setForm:(value:ProjectForm)=>void;assets:Workspace["videoAssets"];busy:boolean;onSave:()=>void;onRun:(stage:Stage)=>void;onApprove:()=>void}){
  const set=(key:keyof ProjectForm,value:string)=>setForm({...form,[key]:value});
  const run=project.runs.find((item)=>item.stage===stage&&item.status==="completed")??project.runs.find((item)=>item.stage===stage);
  const locked=project.currentStage!==stage&&!(project.currentStage==="done"&&stage==="analytics");
  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <Card title={STAGE_LABEL[stage]} icon={run?.status==="completed"?<CheckCircle2 className="size-4 text-emerald-400"/>:<Play className="size-4"/>}>
      <p className="text-sm text-slate-400">{STAGE_HINT[stage]}</p>
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Название проекта" value={form.title} onChange={(value)=>set("title",value)}/><Input label="Язык" value={form.language} onChange={(value)=>set("language",value)}/></div>
      <Field label="Тема"><textarea className={cn(inputClass,"min-h-20")} value={form.topic} onChange={(event)=>set("topic",event.target.value)}/></Field>
      {(stage==="research"||stage==="plan")?<div className="grid gap-3 sm:grid-cols-2"><Input label="Аудитория" value={form.targetAudience} onChange={(value)=>set("targetAudience",value)}/><Input label="Цель" value={form.goal} onChange={(value)=>set("goal",value)}/></div>:null}
      {(stage==="package"||stage==="production"||stage==="publish")?<Packaging form={form} set={set}/>:null}
      {(stage==="production"||stage==="publish")?<><Select label="Видео Genora" value={form.videoAssetId} onChange={(value)=>set("videoAssetId",value)} options={[["","Не выбрано"],...assets.map((asset)=>[asset.id,`${asset.id} · ${fileSize(asset.bytes)}`])]}/><Input label="Дата и время публикации" type="datetime-local" value={form.scheduledAt} onChange={(value)=>set("scheduledAt",value)}/></>:null}
      {stage==="publish"?<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100"><ShieldCheck className="mr-2 inline size-4"/>Публикация выполняется только после отдельного подтверждения администратора. {project.publishApprovedAt?"Подтверждение получено.":"Пока не подтверждено."}</div>:null}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={onSave} className={secondaryButton}><Save className="size-4"/>Сохранить</button>{stage==="publish"&&!project.publishApprovedAt?<button type="button" disabled={busy||locked} onClick={onApprove} className={primaryButton}><ShieldCheck className="size-4"/>Подтвердить публикацию</button>:<button type="button" disabled={busy||locked||(stage==="publish"&&!project.publishApprovedAt)} onClick={()=>onRun(stage)} className={primaryButton}><Play className="size-4"/>{run?.status==="completed"?"Выполнить повторно":"Завершить и перейти дальше"}</button>}</div>
      {locked?<p className="text-xs text-amber-300">Сначала завершите предыдущий этап.</p>:null}
      {project.publishedUrl?<a href={project.publishedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-orange-300"><ExternalLink className="size-4"/>Открыть опубликованное видео</a>:null}
    </Card>
    <Card title="Результат этапа" icon={<Clock className="size-4"/>}>{run?<><div className="flex items-center justify-between gap-3"><Status ok={run.status==="completed"} label={run.status}/><span className="text-[10px] text-slate-500">{new Date(run.startedAt).toLocaleString("ru-RU")}</span></div>{run.error?<Message tone="error">{run.error}</Message>:null}<pre className="max-h-[680px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">{JSON.stringify(run.output,null,2)}</pre></>:<p className="grid min-h-56 place-items-center text-sm text-slate-500">Этап ещё не запускался</p>}</Card>
  </div>;
}

function Packaging({form,set}:{form:ProjectForm;set:(key:keyof ProjectForm,value:string)=>void}){return <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Финальная упаковка</h3><Input label="YouTube title" value={form.youtubeTitle} onChange={(value)=>set("youtubeTitle",value)}/><Field label="Description"><textarea className={cn(inputClass,"min-h-28")} value={form.description} onChange={(event)=>set("description",event.target.value)}/></Field><Input label="Tags через запятую" value={form.tags} onChange={(value)=>set("tags",value)}/><Field label="Thumbnail brief"><textarea className={cn(inputClass,"min-h-20")} value={form.thumbnailBrief} onChange={(event)=>set("thumbnailBrief",event.target.value)}/></Field><div className="grid gap-3 sm:grid-cols-2"><Select label="Privacy" value={form.privacyStatus} onChange={(value)=>set("privacyStatus",value)} options={[["private","Private"],["unlisted","Unlisted"],["public","Public"]]}/><Input label="Category ID" value={form.categoryId} onChange={(value)=>set("categoryId",value)}/></div></div>}

function Card({title,icon,children}:{title:string;icon?:ReactNode;children:ReactNode}){return <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><header className="flex items-center gap-2"><span className="text-orange-300">{icon}</span><h2 className="font-semibold">{title}</h2></header>{children}</section>}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-xs text-slate-500"><span className="mb-1 block">{label}</span>{children}</label>}
function Input({label,value,onChange,placeholder,type="text"}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;type?:string}){return <Field label={label}><input type={type} value={value} onChange={(event)=>onChange(event.target.value)} placeholder={placeholder} className={cn(inputClass,"h-10")}/></Field>}
function NumberInput({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <Field label={label}><input type="number" min={6} max={720} value={value} onChange={(event)=>onChange(Number(event.target.value))} className={cn(inputClass,"h-10")}/></Field>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[][]}){return <Field label={label}><select value={value} onChange={(event)=>onChange(event.target.value)} className={cn(inputClass,"h-10")}>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></Field>}
function Status({ok,label}:{ok:boolean;label:string}){return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",ok?"bg-emerald-500/15 text-emerald-300":"bg-slate-700 text-slate-300")}><span className={cn("size-1.5 rounded-full",ok?"bg-emerald-400":"bg-slate-500")}/>{label}</span>}
function Requirement({label,ok}:{label:string;ok:boolean}){return <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs"><span>{label}</span><Status ok={ok} label={ok?"готово":"нужно настроить"}/></div>}
function CopyValue({value}:{value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-300 break-all">{value}</div>}
function Setup({lines}:{lines:string[]}){return <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"><p className="mb-2 text-xs font-semibold text-amber-100">Переменные сервера</p><div className="space-y-1 font-mono text-[11px] text-amber-200">{lines.map((line)=><p key={line}>{line}</p>)}</div></div>}
function Message({tone="ok",children}:{tone?:"ok"|"error";children:ReactNode}){return <p className={cn("rounded-xl p-3 text-sm",tone==="error"?"bg-red-500/10 text-red-300":"bg-emerald-500/10 text-emerald-300")}>{children}</p>}
