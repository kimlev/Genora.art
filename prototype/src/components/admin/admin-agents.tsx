"use client";

import { AgentPreviewCard } from "@/components/agents/agent-preview-card";
import { AdminSelect } from "@/components/admin/admin-select";
import { CATALOG_AGENTS_CHANGED } from "@/lib/catalog-agent-overrides";
import { systemAgentTagOptions, type SystemAgentKind } from "@/lib/system-agent-kind";
import { stillPreviewSrc } from "@/lib/agent-preview";
import { AGENT_DESCRIPTION_MAX, AGENT_NAME_MAX } from "@/lib/agent-context";
import type { StudioVideoMode, VideoCatalogModel } from "@/lib/catalog/video-studio";
import type { VideoAgentReferenceInput, VideoAgentSettings } from "@/lib/video-agent-catalog";
import { ImageIcon, LayoutGrid, Loader2, MessageSquare, Trash2, Upload, Video } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type AdminAgent = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: SystemAgentKind;
  tag: string;
  icon: string;
  coverUrl: string | null;
  providerId: string;
  modelId: string;
  videoMode: StudioVideoMode | null;
  videoUrl: string | null;
  videoPreviewUrl: string | null;
  promptPlaceholder: string;
  referenceInputs: VideoAgentReferenceInput[];
  videoSettings: Partial<VideoAgentSettings>;
  systemPrompt: string;
  created: boolean;
};

const KIND_LABEL: Record<SystemAgentKind, string> = { text: "Чат", images: "Изображения", video: "Видео" };
const TAG_LABEL: Record<string, string> = {
  writing: "Тексты",
  code: "Код",
  analysis: "Анализ",
  marketing: "Маркетинг",
  video: "Видео",
  intro: "Интро",
  "ai-dances": "ИИ танцы",
  promo: "Промо",
  entertainment: "Развлечения",
  "animate-photo": "Оживи фото",
  "luxury-life": "Роскошная жизнь",
  birthday: "С днём рождения",
  background: "Работа с фоном",
  "photo-processing": "Обработка фото",
  "photo-poses": "Фото позы",
  "face-retouch": "Ретушь лица",
  "photo-effects": "Фотоэффекты",
  hair: "Прическа",
  clothes: "Одежда",
  locations: "Локации",
  design: "Дизайн",
};

const emptyDraft = (): AdminAgent => ({
  id: "",
  name: "",
  description: "",
  category: "writing",
  kind: "text",
  tag: "writing",
  icon: "sparkles",
  coverUrl: null,
  providerId: "",
  modelId: "",
  videoMode: null,
  videoUrl: null,
  videoPreviewUrl: null,
  promptPlaceholder: "",
  referenceInputs: [],
  videoSettings: {},
  systemPrompt: "",
  created: true,
});

export function AdminAgents() {
  const [items, setItems] = useState<AdminAgent[]>([]);
  const [kind, setKind] = useState<SystemAgentKind | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<AdminAgent | null>(null);
  const [baseline, setBaseline] = useState<AdminAgent | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [videoCatalog, setVideoCatalog] = useState<{ providers: Array<{ id: string; label: string }>; models: VideoCatalogModel[] }>({ providers: [], models: [] });
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [response, videoResponse] = await Promise.all([
      fetch("/api/admin/agents", { cache: "no-store" }),
      fetch("/api/video/catalog", { cache: "no-store" }),
    ]);
    const data = await response.json().catch(() => null) as { items?: AdminAgent[]; error?: string } | null;
    if (!response.ok) setError(data?.error ?? "Не удалось загрузить агентов");
    else setItems(data?.items ?? []);
    if (videoResponse.ok) {
      const videoData = await videoResponse.json().catch(() => null) as { providers?: Array<{ id: string; label: string }>; models?: VideoCatalogModel[] } | null;
      setVideoCatalog({ providers: videoData?.providers ?? [], models: videoData?.models ?? [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const openCreate = () => {
      const draft = emptyDraft();
      setCreating(true);
      setEditor(draft);
      setBaseline(draft);
      setMessage(null);
    };
    window.addEventListener("admin-create-agent", openCreate);
    return () => window.removeEventListener("admin-create-agent", openCreate);
  }, []);

  const visible = useMemo(
    () => items.filter((item) => (kind === "all" || item.kind === kind) && (tagFilter === "all" || item.tag === tagFilter)),
    [items, kind, tagFilter],
  );

  const editorChanged = useMemo(
    () => Boolean(editor && baseline && JSON.stringify(editor) !== JSON.stringify(baseline)),
    [baseline, editor],
  );
  const canSave = Boolean(editor?.name.trim()) && editorChanged && !saving && !uploading
    && (editor?.kind !== "video" || Boolean(editor.providerId && editor.modelId && editor.videoMode && editor.videoUrl && editor.videoPreviewUrl));

  const openEditor = (agent: AdminAgent) => {
    setCreating(false);
    setEditor({ ...agent });
    setBaseline({ ...agent });
    setMessage(null);
  };

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    setMessage(null);
    const payload = {
      name: editor.name,
      description: editor.description,
      kind: editor.kind,
      tag: editor.tag,
      icon: editor.icon,
      coverUrl: editor.coverUrl,
      providerId: editor.providerId,
      modelId: editor.modelId,
      videoMode: editor.videoMode,
      videoUrl: editor.videoUrl,
      videoPreviewUrl: editor.videoPreviewUrl,
      promptPlaceholder: editor.promptPlaceholder,
      referenceInputs: editor.referenceInputs,
      videoSettings: editor.videoSettings,
      systemPrompt: editor.systemPrompt,
      create: creating,
    };
    const response = await fetch(creating ? "/api/admin/agents" : `/api/admin/agents/${editor.id}`, {
      method: creating ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(creating ? payload : payload),
    });
    const data = await response.json().catch(() => null) as { item?: AdminAgent; error?: string } | null;
    if (!response.ok) setMessage(data?.error ?? "Не удалось сохранить");
    else {
      window.dispatchEvent(new Event(CATALOG_AGENTS_CHANGED));
      await load();
      const saved = data?.item ?? null;
      setEditor(saved);
      setBaseline(saved ? { ...saved } : null);
      setCreating(false);
      setMessage("Сохранено. На сайте и в запросах к модели настройки обновятся сразу.");
    }
    setSaving(false);
  };

  const onCover = (file: File | null) => {
    if (!file || !editor) return;
    if (file.size > 1_500_000) {
      setMessage("Картинка больше 1.5 МБ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditor((current) => current ? { ...current, coverUrl: String(reader.result ?? "") } : current);
    reader.readAsDataURL(file);
  };

  const uploadAsset = async (file: File, purpose: "cover" | "reference") => {
    const form = new FormData();
    form.set("file", file);
    form.set("purpose", purpose);
    const response = await fetch("/api/admin/agents/assets", { method: "POST", body: form });
    const data = await response.json().catch(() => null) as { kind?: "image" | "video"; url?: string; previewUrl?: string; error?: string } | null;
    if (!response.ok || !data?.kind || !data.url) throw new Error(data?.error ?? "Не удалось загрузить файл");
    return { kind: data.kind, url: data.url, previewUrl: data.previewUrl ?? data.url };
  };

  const onVideoPreview = async (file: File | null) => {
    if (!file || !editor) return;
    setUploading("preview");
    setMessage(null);
    try {
      const asset = await uploadAsset(file, "cover");
      if (asset.kind !== "video") throw new Error("Для превью выберите видео");
      setEditor((current) => current ? { ...current, videoUrl: asset.url, videoPreviewUrl: asset.previewUrl } : current);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить видео"); }
    finally { setUploading(null); }
  };

  const onReference = async (index: number, file: File | null) => {
    if (!file || !editor) return;
    setUploading(`reference-${index}`);
    setMessage(null);
    try {
      const asset = await uploadAsset(file, "reference");
      const role = index === 0 ? "first-frame" : index === 3 ? "last-frame" : "reference";
      setEditor((current) => {
        if (!current) return current;
        const next = current.referenceInputs.filter((item) => item.slot !== index);
        next.push({ ...asset, role, slot: index });
        return { ...current, referenceInputs: next };
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить файл"); }
    finally { setUploading(null); }
  };

  if (loading && !items.length) {
    return <div className="grid min-h-40 place-items-center"><Loader2 className="size-6 animate-spin text-orange-400" /></div>;
  }

  if (editor) {
    const tags = systemAgentTagOptions(editor.kind);
    const modeModels = videoCatalog.models.filter((item) => {
      const modes = item.modes ?? [];
      if (editor.videoMode === "t2v") return modes.includes("text-to-video");
      if (editor.videoMode === "animate") return modes.includes("image-to-video");
      if (editor.videoMode === "i2v") return modes.includes("ref-to-video") || modes.includes("image-to-video");
      if (editor.videoMode === "v2v") return modes.includes("video-to-video") || modes.includes("motion-control");
      return false;
    });
    const providerModels = modeModels.filter((item) => !editor.providerId || item.provider === editor.providerId);
    const referenceLabels = ["первый кадр", "референс", "референс", "последний кадр"];
    return (
      <div className="max-w-3xl space-y-5">
        <button type="button" onClick={() => { setEditor(null); setBaseline(null); setCreating(false); setMessage(null); }} className="text-xs text-slate-400 hover:text-slate-100">
          ← К списку агентов
        </button>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="relative aspect-[16/9] bg-slate-950">
            {editor.kind === "video" && editor.videoPreviewUrl ? (
              <video src={editor.videoPreviewUrl} muted loop autoPlay playsInline className="size-full object-cover" />
            ) : (
              <Image src={editor.coverUrl || stillPreviewSrc(editor.id || "preview")} alt="" fill unoptimized sizes="768px" className="object-cover" />
            )}
          </div>
          <div className="space-y-4 p-5">
            {editor.kind === "video" ? (
              <label className="grid gap-1 text-xs text-slate-400">
                Лёгкое видео-превью для карточки
                <input type="file" accept="video/mp4,video/quicktime,video/webm" disabled={Boolean(uploading)} onChange={(event) => void onVideoPreview(event.target.files?.[0] ?? null)} className="text-slate-200" />
                <span className="text-[11px] text-slate-500">Полное видео и отдельная облегчённая версия создаются автоматически.</span>
              </label>
            ) : (
              <label className="grid gap-1 text-xs text-slate-400">
                Картинка
                <input type="file" accept="image/*" onChange={(event) => onCover(event.target.files?.[0] ?? null)} className="text-slate-200" />
              </label>
            )}
            <label className="grid gap-1 text-xs text-slate-400">
              Название
              <input value={editor.name} maxLength={AGENT_NAME_MAX} onChange={(event) => setEditor({ ...editor, name: event.target.value })} className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
            </label>
            <label className="grid gap-1 text-xs text-slate-400">
              Короткое описание
              <textarea value={editor.description} maxLength={AGENT_DESCRIPTION_MAX} onChange={(event) => setEditor({ ...editor, description: event.target.value })} className="min-h-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminSelect
                label="Тип"
                value={editor.kind}
                options={([
                  { value: "text", label: "Чат", icon: <MessageSquare className="size-4" /> },
                  { value: "images", label: "Изображения", icon: <ImageIcon className="size-4" /> },
                  { value: "video", label: "Видео", icon: <Video className="size-4" /> },
                ])}
                emptyLabel="Выберите тип"
                clearable={false}
                onChange={(value) => {
                  const next = value as SystemAgentKind;
                  setEditor({ ...editor, kind: next, tag: systemAgentTagOptions(next)[0], videoMode: next === "video" ? (editor.videoMode ?? "t2v") : null });
                }}
              />
              <AdminSelect
                label="Тег"
                value={editor.tag}
                options={tags.map((item) => ({ value: item, label: TAG_LABEL[item] ?? item }))}
                emptyLabel="Выберите тег"
                clearable={false}
                onChange={(tag) => setEditor({ ...editor, tag })}
              />
            </div>
            {editor.kind === "video" ? (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <AdminSelect
                    label="Режим агента"
                    value={editor.videoMode ?? ""}
                    options={[
                      { value: "t2v", label: "Текст → видео" },
                      { value: "animate", label: "Картинка → видео" },
                      { value: "i2v", label: "Референс → видео" },
                      { value: "v2v", label: "Видео → видео" },
                    ]}
                    emptyLabel="Выберите режим"
                    clearable={false}
                    onChange={(value) => setEditor({ ...editor, videoMode: value as StudioVideoMode, providerId: "", modelId: "" })}
                  />
                  <AdminSelect
                    label="Рекомендуемый провайдер"
                    value={editor.providerId}
                    options={videoCatalog.providers.filter((item) => modeModels.some((model) => model.provider === item.id)).map((item) => ({ value: item.id, label: item.label }))}
                    emptyLabel="Выберите провайдера"
                    clearable
                    onChange={(providerId) => setEditor({ ...editor, providerId, modelId: "" })}
                  />
                  <AdminSelect
                    label="Рекомендуемая модель"
                    value={editor.modelId}
                    options={providerModels.map((item) => ({ value: item.id, label: item.label }))}
                    emptyLabel="Выберите модель"
                    clearable
                    onChange={(modelId) => setEditor({ ...editor, modelId })}
                  />
                </div>
                <label className="grid gap-1 text-xs text-slate-400">
                  Подсказка в поле запроса
                  <input value={editor.promptPlaceholder} maxLength={240} onChange={(event) => setEditor({ ...editor, promptPlaceholder: event.target.value })} placeholder="Например: укажите, какую погоду создать" className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
                </label>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-300">Фото и видео, которые агент передаёт модели</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {referenceLabels.map((label, index) => {
                      const asset = editor.referenceInputs.find((item) => item.slot === index) ?? editor.referenceInputs[index];
                      return (
                        <div key={`${label}-${index}`} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                          <div className="grid aspect-[4/5] place-items-center bg-slate-900">
                            {asset?.kind === "video" ? <video src={asset.previewUrl || asset.url} muted loop autoPlay playsInline className="size-full object-cover" /> : asset?.url ? <img src={asset.url} alt="" className="size-full object-cover" /> : <Upload className="size-6 text-slate-600" />}
                          </div>
                          <div className="space-y-2 p-2">
                            <p className="text-[11px] font-semibold text-slate-300">Фото {index + 1}/Видео {index + 1}</p>
                            <p className="text-[10px] text-slate-500">{label}</p>
                            <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" disabled={Boolean(uploading)} onChange={(event) => void onReference(index, event.target.files?.[0] ?? null)} className="w-full text-[10px] text-slate-400" />
                            {asset ? <button type="button" onClick={() => setEditor({ ...editor, referenceInputs: editor.referenceInputs.filter((item, itemIndex) => item.slot != null ? item.slot !== index : itemIndex !== index) })} className="inline-flex items-center gap-1 text-[10px] text-red-400"><Trash2 className="size-3" /> Удалить</button> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">В системных настройках можно указать: «используй персонажа на фото 1», «используй референс» или роль другого слота.</p>
                </div>
              </div>
            ) : null}
            <label className="grid gap-1 text-xs text-slate-400">
              Системные настройки
              <textarea
                value={editor.systemPrompt}
                onChange={(event) => setEditor({ ...editor, systemPrompt: event.target.value })}
                className="min-h-64 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
              />
            </label>
            <button type="button" disabled={!canSave} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Сохранить
            </button>
            {message ? <p className="text-xs text-orange-300">{message}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error ? <p className="mb-3 text-xs text-red-400">{error}</p> : null}
      <div className="mb-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setKind("all"); setTagFilter("all"); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${kind === "all" ? "border-orange-500 bg-orange-500 text-white" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-100"}`}
          >
            <LayoutGrid className="size-3.5" />
            Все агенты
          </button>
          {(["text", "images", "video"] as const).map((item) => {
            const Icon = item === "images" ? ImageIcon : item === "video" ? Video : MessageSquare;
            return (
              <button
                key={item}
                type="button"
                onClick={() => { setKind(item); setTagFilter("all"); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${kind === item ? "border-orange-500 bg-orange-500 text-white" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-100"}`}
              >
                <Icon className="size-3.5" />
                {KIND_LABEL[item]}
              </button>
            );
          })}
        </div>
        {kind !== "all" ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            <button type="button" onClick={() => setTagFilter("all")} className={`rounded-full px-3 py-1.5 text-xs ${tagFilter === "all" ? "bg-orange-500/20 font-semibold text-orange-300" : "bg-slate-950 text-slate-400 hover:text-slate-100"}`}>Все теги</button>
            {systemAgentTagOptions(kind).map((tag) => (
              <button key={tag} type="button" onClick={() => setTagFilter(tag)} className={`rounded-full px-3 py-1.5 text-xs ${tagFilter === tag ? "bg-orange-500/20 font-semibold text-orange-300" : "bg-slate-950 text-slate-400 hover:text-slate-100"}`}>
                {TAG_LABEL[tag] ?? tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((agent) => (
          <div key={agent.id} className="cursor-pointer" onClick={() => openEditor(agent)}>
            <AgentPreviewCard
              agentId={agent.id}
              title={agent.name}
              description={agent.description}
              useLabel="Открыть"
              tag={TAG_LABEL[agent.tag] ?? KIND_LABEL[agent.kind]}
              coverSrc={agent.coverUrl ?? undefined}
              videoPreviewSrc={agent.kind === "video" ? agent.videoPreviewUrl ?? undefined : undefined}
              videoFullSrc={agent.kind === "video" ? agent.videoUrl ?? undefined : undefined}
              onUse={() => openEditor(agent)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
