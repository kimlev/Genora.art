import "server-only";

import { IMAGE_AGENT_RESULT_PROMPTS } from "@/lib/image-agent-result-prompts";
import { agents, getAgentById } from "@/lib/mock/agents";
import type { Agent, AgentCategory } from "@/lib/mock/agent-types";
import { categoryFromKind, isSystemAgentTag, systemAgentKind, systemAgentTag, type SystemAgentKind } from "@/lib/system-agent-kind";
import { VIDEO_PROMPT_MODEL_INSTRUCTION } from "@/lib/video-prompt-agent";
import {
  videoAgentDefaults,
  type VideoAgentReferenceInput,
  type VideoAgentSettings,
} from "@/lib/video-agent-catalog";
import { studioIntegratorMode, type StudioVideoMode, type VideoCatalogModel } from "@/lib/catalog/video-studio";
import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import { query } from "./db";
import { optimizeAgentCover } from "./image-optimization";
import { loadMediaAsset, storeMediaAsset } from "./media-assets";
import { integratorVideoCatalogFull } from "./integrator";

export type SystemAgentOverride = {
  id: string;
  name: string | null;
  description: string | null;
  category: AgentCategory | null;
  tag: string | null;
  icon: string | null;
  coverUrl: string | null;
  providerId: string | null;
  modelId: string | null;
  videoMode: StudioVideoMode | null;
  videoUrl: string | null;
  videoPreviewUrl: string | null;
  promptPlaceholder: string | null;
  referenceInputs: VideoAgentReferenceInput[];
  videoSettings: Partial<VideoAgentSettings>;
  systemPrompt: string | null;
  created: boolean;
};

export type AdminSystemAgent = {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
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

type OverrideRow = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  tag: string | null;
  icon: string | null;
  cover_url: string | null;
  provider_id: string | null;
  model_id: string | null;
  video_mode: string | null;
  video_url: string | null;
  video_preview_url: string | null;
  prompt_placeholder: string | null;
  reference_inputs: unknown;
  video_settings: unknown;
  system_prompt: string | null;
  created: boolean;
};

const rowToOverride = (row: OverrideRow): SystemAgentOverride => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: (row.category as AgentCategory | null) ?? null,
  tag: row.tag,
  icon: row.icon,
  coverUrl: row.cover_url,
  providerId: row.provider_id,
  modelId: row.model_id,
  videoMode: asVideoMode(row.video_mode),
  videoUrl: row.video_url,
  videoPreviewUrl: row.video_preview_url,
  promptPlaceholder: row.prompt_placeholder,
  referenceInputs: asReferenceInputs(row.reference_inputs),
  videoSettings: asVideoSettings(row.video_settings),
  systemPrompt: row.system_prompt,
  created: row.created,
});

const OVERRIDE_COLUMNS = "id,name,description,category,tag,icon,cover_url,provider_id,model_id,video_mode,video_url,video_preview_url,prompt_placeholder,reference_inputs,video_settings,system_prompt,created";

function asVideoMode(value: unknown): StudioVideoMode | null {
  return value === "t2v" || value === "animate" || value === "i2v" || value === "v2v" ? value : null;
}

function asReferenceInputs(value: unknown): VideoAgentReferenceInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const kind: VideoAgentReferenceInput["kind"] | null = row.kind === "image" || row.kind === "video" ? row.kind : null;
    const role: VideoAgentReferenceInput["role"] | null = row.role === "first-frame" || row.role === "last-frame" || row.role === "reference" ? row.role : null;
    const url = typeof row.url === "string" ? row.url.slice(0, 500) : "";
    if (!kind || !role || !url) return [];
    const slot = Number.isInteger(Number(row.slot)) ? Math.max(0, Math.min(3, Number(row.slot))) : undefined;
    return [{ slot, kind, role, url, previewUrl: typeof row.previewUrl === "string" ? row.previewUrl.slice(0, 500) : null }];
  }).sort((left, right) => (left.slot ?? 99) - (right.slot ?? 99)).slice(0, 4);
}

function asVideoSettings(value: unknown): Partial<VideoAgentSettings> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    duration: Number.isFinite(Number(row.duration)) ? Math.max(4, Math.min(30, Math.round(Number(row.duration)))) : undefined,
    resolution: typeof row.resolution === "string" ? row.resolution.slice(0, 30) : undefined,
    aspectRatio: typeof row.aspectRatio === "string" ? row.aspectRatio.slice(0, 30) : undefined,
    sound: row.sound === "on" || row.sound === "off" ? row.sound : undefined,
    style: typeof row.style === "string" ? row.style.slice(0, 50) : undefined,
  };
}

async function run<T extends OverrideRow>(sql: string, values: unknown[] = [], client?: PoolClient): Promise<T[]> {
  if (client) {
    const result = await client.query<T>(sql, values);
    return result.rows;
  }
  return query<T>(sql, values);
}

export async function getSystemAgentOverride(id: string, client?: PoolClient): Promise<SystemAgentOverride | null> {
  try {
    const rows = await run(`SELECT ${OVERRIDE_COLUMNS} FROM system_agent_overrides WHERE id=$1`, [id], client);
    return rows[0] ? rowToOverride(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function listSystemAgentOverrides(client?: PoolClient): Promise<SystemAgentOverride[]> {
  try {
    const rows = await run(`SELECT ${OVERRIDE_COLUMNS} FROM system_agent_overrides`, [], client);
    return rows.map(rowToOverride);
  } catch {
    return [];
  }
}

function catalogPrompt(agent: Agent): string {
  if (agent.id === "video-promt") return agent.systemPrompt || VIDEO_PROMPT_MODEL_INSTRUCTION;
  if (agent.category === "images") return IMAGE_AGENT_RESULT_PROMPTS[agent.id] ?? agent.systemPrompt ?? "";
  return agent.systemPrompt ?? "";
}

function toAdminAgent(agent: Agent, override?: SystemAgentOverride | null, imagePrompt?: string): AdminSystemAgent {
  const category = override?.category ?? agent.category;
  const videoDefaults = category === "video" ? videoAgentDefaults(agent.id) : null;
  const merged: Agent = { ...agent, category, name: override?.name || agent.name, description: override?.description || agent.description, icon: override?.icon || agent.icon, modelId: override?.modelId ?? agent.modelId };
  return {
    id: agent.id,
    name: merged.name,
    description: merged.description,
    category,
    kind: systemAgentKind(merged),
    tag: systemAgentTag(merged, override?.tag ?? videoDefaults?.tag),
    icon: merged.icon,
    coverUrl: override?.coverUrl ?? videoDefaults?.coverUrl ?? null,
    providerId: override?.providerId ?? videoDefaults?.providerId ?? "",
    modelId: override?.modelId ?? videoDefaults?.modelId ?? merged.modelId,
    videoMode: override?.videoMode ?? videoDefaults?.videoMode ?? null,
    videoUrl: override?.videoUrl ?? videoDefaults?.videoUrl ?? null,
    videoPreviewUrl: override?.videoPreviewUrl ?? videoDefaults?.videoPreviewUrl ?? null,
    promptPlaceholder: override?.promptPlaceholder ?? videoDefaults?.promptPlaceholder ?? "",
    referenceInputs: override?.referenceInputs.length ? override.referenceInputs : videoDefaults?.referenceInputs ?? [],
    videoSettings: { ...(videoDefaults?.videoSettings ?? {}), ...(override?.videoSettings ?? {}) },
    systemPrompt: override?.systemPrompt ?? imagePrompt ?? catalogPrompt(agent),
    created: override?.created ?? false,
  };
}

export async function listAdminSystemAgents(): Promise<AdminSystemAgent[]> {
  const [overrides, imageRows] = await Promise.all([
    listSystemAgentOverrides(),
    query<{ id: string; prompt_template: string }>("SELECT id,prompt_template FROM image_agents").catch(() => [] as Array<{ id: string; prompt_template: string }>),
  ]);
  const overrideById = new Map(overrides.map((item) => [item.id, item]));
  const imagePromptById = new Map(imageRows.map((item) => [item.id, item.prompt_template]));
  const listed = agents.map((agent) => toAdminAgent(agent, overrideById.get(agent.id), imagePromptById.get(agent.id)));
  const known = new Set(listed.map((item) => item.id));
  const created = overrides.filter((item) => item.created && !known.has(item.id)).map((item) => toAdminAgent({
    id: item.id,
    name: item.name || "Новый агент",
    category: item.category ?? "writing",
    description: item.description || "",
    modelId: item.modelId || "",
    systemPrompt: item.systemPrompt || "",
    icon: item.icon || "sparkles",
  }, item));
  return [...created, ...listed];
}

export type PublicCatalogAgent = {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
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
  created: boolean;
};

export async function listPublicCatalogAgents(): Promise<PublicCatalogAgent[]> {
  const items = await listAdminSystemAgents();
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    tag: item.tag,
    icon: item.icon,
    coverUrl: item.coverUrl,
    providerId: item.providerId,
    modelId: item.modelId,
    videoMode: item.videoMode,
    videoUrl: item.videoUrl,
    videoPreviewUrl: item.videoPreviewUrl,
    promptPlaceholder: item.promptPlaceholder,
    referenceInputs: item.referenceInputs,
    videoSettings: item.videoSettings,
    created: item.created,
  }));
}

export async function resolveVideoPromptInstruction(client?: PoolClient): Promise<string> {
  const override = await getSystemAgentOverride("video-promt", client);
  return override?.systemPrompt || VIDEO_PROMPT_MODEL_INSTRUCTION;
}

function slugFromName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug || `agent-${Date.now()}`;
}

export type SaveSystemAgentInput = {
  id?: string;
  name: string;
  description: string;
  kind: SystemAgentKind;
  tag?: string | null;
  icon?: string | null;
  coverUrl?: string | null;
  providerId?: string | null;
  modelId?: string | null;
  videoMode?: StudioVideoMode | null;
  videoUrl?: string | null;
  videoPreviewUrl?: string | null;
  promptPlaceholder?: string | null;
  referenceInputs?: VideoAgentReferenceInput[];
  videoSettings?: Partial<VideoAgentSettings>;
  systemPrompt: string;
  create?: boolean;
};

async function persistAgentCover(id: string, rawCoverUrl?: string | null): Promise<string | null> {
  const coverUrl = rawCoverUrl?.trim() || null;
  if (!coverUrl || !coverUrl.startsWith("data:image/")) return coverUrl;
  const match = /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/=]+)$/i.exec(coverUrl.slice(0, 12_000_000));
  if (!match) throw new Error("COVER_INVALID");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error("COVER_INVALID");
  const optimized = await optimizeAgentCover(bytes, match[1].toLowerCase());
  if (!optimized) throw new Error("COVER_INVALID");
  const mediaId = `agent-cover-${createHash("sha256").update(id).digest("hex").slice(0, 32)}`;
  await storeMediaAsset(mediaId, "image", optimized.mime, optimized.bytes);
  return `/api/agents/assets/${mediaId}`;
}

export async function saveSystemAgent(input: SaveSystemAgentInput): Promise<AdminSystemAgent> {
  const name = input.name.trim().slice(0, 80);
  const description = input.description.trim().slice(0, 1000);
  if (!name) throw new Error("NAME_REQUIRED");
  if (!isSystemAgentTag(input.kind, input.tag)) throw new Error("TAG_INVALID");
  const category = categoryFromKind(input.kind, input.tag);
  const create = Boolean(input.create) || !input.id || !getAgentById(input.id);
  let id = (input.id || slugFromName(name)).trim().slice(0, 80);
  if (create && getAgentById(id)) id = `${id}-${Date.now().toString(36)}`;
  const existing = await getSystemAgentOverride(id);
  const coverUrl = await persistAgentCover(id, input.coverUrl);
  const videoMode = input.kind === "video" ? asVideoMode(input.videoMode) : null;
  if (input.kind === "video" && !videoMode) throw new Error("VIDEO_MODE_REQUIRED");
  if (input.kind === "video") {
    const providerId = input.providerId?.trim() || "";
    const modelId = input.modelId?.trim() || "";
    const catalog = await integratorVideoCatalogFull();
    const model = catalog.models.find((item) => item.provider === providerId && item.id === modelId) as VideoCatalogModel | undefined;
    if (!model || !studioIntegratorMode(videoMode!, model)) throw new Error("VIDEO_MODEL_INVALID");
    if (!input.videoUrl?.trim() || !input.videoPreviewUrl?.trim()) throw new Error("VIDEO_PREVIEW_REQUIRED");
  }
  const referenceInputs = input.kind === "video" ? asReferenceInputs(input.referenceInputs ?? []) : [];
  const videoSettings = input.kind === "video" ? asVideoSettings(input.videoSettings ?? {}) : {};
  await query(
    `INSERT INTO system_agent_overrides(id,name,description,category,tag,icon,cover_url,provider_id,model_id,video_mode,video_url,video_preview_url,prompt_placeholder,reference_inputs,video_settings,system_prompt,created,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,now())
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       category=EXCLUDED.category,
       tag=EXCLUDED.tag,
       icon=EXCLUDED.icon,
       cover_url=EXCLUDED.cover_url,
       provider_id=EXCLUDED.provider_id,
       model_id=EXCLUDED.model_id,
       video_mode=EXCLUDED.video_mode,
       video_url=EXCLUDED.video_url,
       video_preview_url=EXCLUDED.video_preview_url,
       prompt_placeholder=EXCLUDED.prompt_placeholder,
       reference_inputs=EXCLUDED.reference_inputs,
       video_settings=EXCLUDED.video_settings,
       system_prompt=EXCLUDED.system_prompt,
       created=system_agent_overrides.created OR EXCLUDED.created,
       updated_at=now()`,
    [
      id,
      name,
      description,
      category,
      input.tag?.trim() || null,
      input.icon?.trim() || null,
      coverUrl,
      input.kind === "video" ? input.providerId?.trim() || null : null,
      input.modelId?.trim() || null,
      videoMode,
      input.kind === "video" ? input.videoUrl?.trim() || null : null,
      input.kind === "video" ? input.videoPreviewUrl?.trim() || null : null,
      input.kind === "video" ? input.promptPlaceholder?.trim().slice(0, 240) || null : null,
      JSON.stringify(referenceInputs),
      JSON.stringify(videoSettings),
      input.systemPrompt,
      create || existing?.created || false,
    ],
  );
  if (category === "images") {
    await query(
      `INSERT INTO image_agents(id,name,description,icon,mode,input_min,input_max,consent_required,prompt_template,sort_order)
       VALUES($1,$2,$3,$4,'T2I_OR_EDIT',0,2,false,$5,1000)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,icon=EXCLUDED.icon,prompt_template=EXCLUDED.prompt_template,active=true,updated_at=now()`,
      [id, name, description, input.icon?.trim() || "image", input.systemPrompt],
    ).catch(() => undefined);
  } else {
    await query("UPDATE image_agents SET active=false,updated_at=now() WHERE id=$1", [id]).catch(() => undefined);
  }
  const items = await listAdminSystemAgents();
  const saved = items.find((item) => item.id === id);
  if (!saved) throw new Error("SAVE_FAILED");
  return saved;
}

export async function resolveVideoAgentDefinition(id: string, client?: PoolClient): Promise<AdminSystemAgent | null> {
  const agent = getAgentById(id);
  const override = await getSystemAgentOverride(id, client);
  if (!agent) {
    if (!override?.created || override.category !== "video") return null;
    const resolved = toAdminAgent({
      id: override.id,
      name: override.name || "Видео-агент",
      category: "video",
      description: override.description || "",
      modelId: override.modelId || "",
      systemPrompt: override.systemPrompt || "",
      icon: override.icon || "video",
    }, override);
    return resolved.videoMode ? resolved : null;
  }
  if (agent.category !== "video") return null;
  const resolved = toAdminAgent(agent, override);
  return resolved.kind === "video" && resolved.videoMode ? resolved : null;
}

function agentAssetId(url: string): string | null {
  const match = /^\/api\/agents\/assets\/(agent-(?:cover|video|preview|reference)-[a-f0-9]{32})$/.exec(url);
  return match?.[1] ?? null;
}

export async function videoAgentReferenceDataUrls(agent: AdminSystemAgent): Promise<VideoAgentReferenceInput[]> {
  const output: VideoAgentReferenceInput[] = [];
  for (const item of agent.referenceInputs) {
    const id = agentAssetId(item.url);
    if (!id) continue;
    const asset = await loadMediaAsset(id);
    if (!asset) continue;
    output.push({ ...item, url: `data:${asset.mime};base64,${asset.bytes.toString("base64")}` });
  }
  return output;
}
