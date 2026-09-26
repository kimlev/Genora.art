import "server-only";

import { randomUUID } from "node:crypto";
import {
  AI_CHARACTER_AGENT_ID,
  CHARACTER_AGENT_ID,
  CHARACTER_LIMIT,
  CHARACTER_SOURCE_COUNT,
  type CharacterListPayload,
  type CharacterKind,
  type CharacterSummary,
  validCharacterName,
  validCharacterDescription,
} from "@/lib/characters";
import { findImageAgent, renderImageAgentPrompt } from "@/lib/server/image-agents";
import { query, withTransaction } from "@/lib/server/db";
import { insertGenerationJob, type GenerationJobRow } from "@/lib/server/generation-jobs";
import { quoteImage } from "@/lib/server/generation-quote";
import { integratorImageCatalog, type IntegratorImageModel } from "@/lib/server/integrator";
import type { ImageJobInput } from "@/lib/server/image-jobs";
import { loadMediaAsset, storeMediaAsset } from "@/lib/server/media-assets";
import type { Locale } from "@/lib/i18n/types";

const MAX_SOURCE_BYTES = 8_000_000;
const SOURCE_IMAGE = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/;

const CHARACTER_MODEL_PREFERENCES = [
  { provider: "google", id: "gemini-3.1-flash-image", size: "2K", format: "1:1", reasoning: "high" },
  { provider: "google", id: "gemini-3-pro-image", size: "2K", format: "1:1", reasoning: "high" },
  { provider: "openai", id: "gpt-image-2", size: "1K", format: "1:1", reasoning: "medium" },
  { provider: "alibaba", id: "qwen-image-2.0-pro", size: "2K", format: "1:1", reasoning: "" },
] as const;

type CharacterRow = {
  id: string;
  kind: CharacterKind;
  name: string;
  status: "creating" | "ready" | "failed";
  source_asset_ids: string[];
  sheet_asset_ids: string[];
  model_id: string | null;
  model_label: string | null;
  size: string | null;
  format: string | null;
  created_at: Date;
  complimentary: boolean;
};

function publicCharacter(row: CharacterRow): CharacterSummary {
  const previewId = row.sheet_asset_ids[0] ?? row.source_asset_ids[0];
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    status: row.status,
    previewUrl: previewId ? `/api/images/assets/${previewId}?variant=preview` : null,
    assetId: row.sheet_asset_ids[0] ?? null,
    assetUrl: row.sheet_asset_ids[0] ? `/api/images/assets/${row.sheet_asset_ids[0]}` : null,
    sourcePreviewUrls: row.source_asset_ids.map((id) => `/api/images/assets/${id}?variant=preview`),
    modelId: row.model_id,
    modelLabel: row.model_label,
    size: row.size,
    format: row.format,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listUserCharacters(userId: string): Promise<CharacterListPayload> {
  await query(
    "UPDATE characters SET status='failed',error='CHARACTER_TIMEOUT',updated_at=now() WHERE user_id=$1 AND status='creating' AND updated_at < now()-interval '1 hour'",
    [userId],
  );
  const [rows, freeRows] = await Promise.all([
    query<CharacterRow>(
      `SELECT c.id,c.kind,c.name,c.status,c.source_asset_ids,c.sheet_asset_ids,c.model_id,c.model_label,
              NULLIF(j.payload->>'size','') AS size,NULLIF(j.payload->>'format','') AS format,
              c.created_at,c.complimentary
         FROM characters c
         LEFT JOIN generation_jobs j ON j.id=c.job_id
        WHERE c.user_id=$1 AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC LIMIT 10`,
      [userId],
    ),
    query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM characters WHERE user_id=$1 AND complimentary=true AND status IN ('creating','ready')) AS exists",
      [userId],
    ),
  ]);
  const freeUsed = Boolean(freeRows[0]?.exists);
  let nextBuildTokens: number | null = null;
  try {
    const catalog = await integratorImageCatalog();
    const selected = characterModel(catalog.models);
    if (selected.size && selected.format) {
      const pricing = await query<{ billing_multiplier: string; markup_multiplier: string | null }>(
        `SELECT p.billing_multiplier,m.markup_multiplier
           FROM ai_providers p
           LEFT JOIN ai_models m ON m.id=$2 AND m.active=true
          WHERE p.id=$1 AND p.active=true`,
        [selected.model.provider, selected.model.id],
      );
      const multiplier = Number(pricing[0]?.markup_multiplier ?? pricing[0]?.billing_multiplier);
      if (Number.isFinite(multiplier) && multiplier > 0) nextBuildTokens = quoteImage(selected.model, selected.size, selected.reasoning, 1, multiplier);
    }
  } catch {
    nextBuildTokens = null;
  }
  return { characters: rows.map(publicCharacter), limit: CHARACTER_LIMIT, freeRemaining: freeUsed ? 0 : 1, nextBuildTokens };
}

function decodeSourceImage(value: string): { mime: string; bytes: Buffer } {
  const match = SOURCE_IMAGE.exec(value);
  if (!match) throw new Error("CHARACTER_PHOTOS_REQUIRED");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES) throw new Error("CHARACTER_PHOTOS_REQUIRED");
  return { mime: match[1], bytes };
}

function characterModel(models: IntegratorImageModel[]) {
  const usable = models.filter((model) => model.input_image.supported && (model.max_reference_images ?? 0) >= CHARACTER_SOURCE_COUNT);
  for (const preference of CHARACTER_MODEL_PREFERENCES) {
    const model = usable.find((item) => item.provider === preference.provider && item.id === preference.id);
    if (!model) continue;
    return { model, size: model.sizes.includes(preference.size) ? preference.size : model.sizes[0], format: model.formats.includes(preference.format) ? preference.format : model.formats[0], reasoning: preference.reasoning || model.reasoning?.defaultValue || undefined };
  }
  const model = usable[0];
  if (!model) throw new Error("CHARACTER_MODEL_UNAVAILABLE");
  return { model, size: model.sizes.includes("2K") ? "2K" : model.sizes[0], format: model.formats.includes("1:1") ? "1:1" : model.formats[0], reasoning: model.reasoning?.defaultValue || undefined };
}

export async function createCharacterGeneration(input: {
  requestId: string;
  userId: string;
  name: string;
  locale: Locale;
  kind: CharacterKind;
  description?: string;
  images: string[];
  consentConfirmed: boolean;
}): Promise<{ character: CharacterSummary; job: GenerationJobRow; executeInput: ImageJobInput }> {
  const name = input.name.trim();
  const description = input.description?.trim() ?? "";
  const personal = input.kind === "personal";
  if (personal && !input.consentConfirmed) throw new Error("CONSENT_REQUIRED");
  if (!validCharacterName(name)) throw new Error("CHARACTER_NAME_INVALID");
  if (personal && input.images.length !== CHARACTER_SOURCE_COUNT) throw new Error("CHARACTER_PHOTOS_REQUIRED");
  if (!personal && !validCharacterDescription(description)) throw new Error("CHARACTER_DESCRIPTION_REQUIRED");
  const decoded = personal ? input.images.map(decodeSourceImage) : [];
  const catalog = await integratorImageCatalog();
  const selected = characterModel(catalog.models);
  if (!selected.size || !selected.format) throw new Error("CHARACTER_MODEL_UNAVAILABLE");
  const characterId = randomUUID();
  const sourceAssetIds = decoded.map(() => randomUUID());
  let complimentary = false;

  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.userId]);
    await client.query(
      "UPDATE characters SET status='failed',error='CHARACTER_TIMEOUT',updated_at=now() WHERE user_id=$1 AND status='creating' AND updated_at < now()-interval '1 hour'",
      [input.userId],
    );
    const free = await client.query("SELECT id FROM characters WHERE user_id=$1 AND complimentary=true AND status IN ('creating','ready') LIMIT 1", [input.userId]);
    complimentary = !free.rowCount;
    await client.query(
      `INSERT INTO characters(id,user_id,kind,name,description,status,source_asset_ids,provider,model_id,model_label,consent_confirmed_at,complimentary)
       VALUES($1,$2,$3,$4,$5,'creating',$6,$7,$8,$9,now(),$10)`,
      [characterId, input.userId, input.kind, name, personal ? null : description, sourceAssetIds, selected.model.provider, selected.model.id, selected.model.label, complimentary],
    );
  });

  try {
    for (let index = 0; index < decoded.length; index += 1) {
      await storeMediaAsset(sourceAssetIds[index], "image", decoded[index].mime, decoded[index].bytes);
    }
    const setup = await withTransaction(async (client) => {
      const provider = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1 AND active=true", [selected.model.provider]);
      const model = await client.query<{ markup_multiplier: string }>("SELECT markup_multiplier FROM ai_models WHERE id=$1 AND active=true", [selected.model.id]);
      if (!provider.rows[0] || !model.rows[0]) throw new Error("CHARACTER_MODEL_UNAVAILABLE");
      const agent = await findImageAgent(personal ? CHARACTER_AGENT_ID : AI_CHARACTER_AGENT_ID, client, input.userId);
      if (!agent) throw new Error("CHARACTER_MODEL_UNAVAILABLE");
      const conversation = await client.query<{ id: string; title: string; updated_at: Date }>(
        "INSERT INTO image_conversations(user_id,title) VALUES($1,$2) RETURNING id,title,updated_at",
        [input.userId, name],
      );
      return {
        agent,
        conversation: conversation.rows[0],
        multiplier: Number(model.rows[0].markup_multiplier ?? provider.rows[0].billing_multiplier),
      };
    });
    const storedPrompt = personal ? `Character: ${name}` : description;
    const prompt = renderImageAgentPrompt(setup.agent, personal ? "" : description, selected.format, {
      size: selected.size,
      quality: selected.reasoning,
      style: "photorealistic",
      photoCount: personal ? CHARACTER_SOURCE_COUNT : 0,
    });
    const job = await insertGenerationJob({
      id: input.requestId,
      complimentary,
      reservationTokens: complimentary ? undefined : quoteImage(selected.model, selected.size, selected.reasoning, 1, setup.multiplier),
      userId: input.userId,
      kind: "image",
      surface: "images",
      conversationId: setup.conversation.id,
      title: name,
      modelLabel: selected.model.label,
      payload: {
        characterId,
        complimentary,
        conversationId: setup.conversation.id,
        conversationTitle: setup.conversation.title,
        locale: input.locale,
        multiplier: setup.multiplier,
        provider: selected.model.provider,
        model: selected.model.id,
        prompt,
        storedPrompt,
        size: selected.size,
        format: selected.format,
        style: "photorealistic",
        reasoning: selected.reasoning,
        count: 1,
        imageAgentId: setup.agent.id,
        imageAgentName: personal ? "Карточка персонажа" : "Карточка AI персонажа",
        agentName: personal ? "Карточка персонажа" : "Карточка AI персонажа",
        sourceImageCount: personal ? CHARACTER_SOURCE_COUNT : 0,
      },
    });
    await query("UPDATE characters SET job_id=$2,updated_at=now() WHERE id=$1", [characterId, job.id]);
    const executeInput: ImageJobInput = {
      complimentary,
      characterId,
      jobId: job.id,
      userId: input.userId,
      conversationId: setup.conversation.id,
      conversationTitle: setup.conversation.title,
      locale: input.locale,
      multiplier: setup.multiplier,
      provider: selected.model.provider,
      model: selected.model.id,
      prompt,
      storedPrompt,
      size: selected.size,
      format: selected.format,
      style: "photorealistic",
      reasoning: selected.reasoning,
      inputImage: personal ? input.images[0] : undefined,
      inputImages: personal ? input.images : undefined,
      count: 1,
      imageAgentId: setup.agent.id,
      imageAgentName: personal ? "Карточка персонажа" : "Карточка AI персонажа",
      sourceImageCount: personal ? CHARACTER_SOURCE_COUNT : 0,
    };
    return {
      job,
      executeInput,
      character: publicCharacter({ id: characterId, kind: input.kind, name, status: "creating", source_asset_ids: sourceAssetIds, sheet_asset_ids: [], model_id: selected.model.id, model_label: selected.model.label, size: selected.size, format: selected.format, created_at: job.created_at, complimentary }),
    };
  } catch (error) {
    await markCharacterFailed(characterId, error instanceof Error ? error.message : "failed");
    throw error;
  }
}

export async function markCharacterReady(characterId: string, assetIds: string[]): Promise<void> {
  await query(
    "UPDATE characters SET status='ready',sheet_asset_ids=$2,error=NULL,updated_at=now() WHERE id=$1 AND status='creating' AND deleted_at IS NULL",
    [characterId, assetIds],
  );
}

export async function markCharacterFailed(characterId: string, reason: string): Promise<void> {
  await query(
    "UPDATE characters SET status='failed',error=$2,updated_at=now() WHERE id=$1 AND status='creating'",
    [characterId, reason.slice(0, 500)],
  );
}

export async function characterReferenceDataUrls(userId: string, characterId: string): Promise<string[]> {
  const rows = await query<{ sheet_asset_ids: string[] }>(
    "SELECT sheet_asset_ids FROM characters WHERE id=$1 AND user_id=$2 AND status='ready' AND deleted_at IS NULL",
    [characterId, userId],
  );
  const ids = rows[0]?.sheet_asset_ids.slice(0, 1) ?? [];
  if (!ids.length) throw new Error("CHARACTER_NOT_FOUND");
  const result: string[] = [];
  for (const id of ids) {
    const asset = await loadMediaAsset(id);
    if (!asset) throw new Error("CHARACTER_NOT_FOUND");
    result.push(`data:${asset.mime};base64,${asset.bytes.toString("base64")}`);
  }
  return result;
}

export async function characterKindForUser(userId: string, characterId: string): Promise<CharacterKind> {
  const rows = await query<{ kind: CharacterKind }>(
    "SELECT kind FROM characters WHERE id=$1 AND user_id=$2 AND status='ready' AND deleted_at IS NULL",
    [characterId, userId],
  );
  if (!rows[0]) throw new Error("CHARACTER_NOT_FOUND");
  return rows[0].kind;
}

export async function archiveUserCharacter(userId: string, characterId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const character = await client.query<{ sheet_asset_ids: string[] }>(
      `UPDATE characters
          SET deleted_at=now(),updated_at=now()
        WHERE id=$1 AND user_id=$2 AND status='ready' AND deleted_at IS NULL
        RETURNING sheet_asset_ids`,
      [characterId, userId],
    );
    const assetIds = character.rows[0]?.sheet_asset_ids ?? [];
    if (!character.rowCount) return false;
    if (!assetIds.length) return true;
    const archived = await client.query<{ conversation_id: string }>(
      `UPDATE image_generations
          SET deleted_at=now()
        WHERE user_id=$1 AND deleted_at IS NULL AND asset_ids && $2::text[]
        RETURNING conversation_id`,
      [userId, assetIds],
    );
    for (const conversationId of new Set(archived.rows.map((row) => row.conversation_id))) {
      const leftover = await client.query(
        `SELECT id FROM image_generations WHERE conversation_id=$1 AND deleted_at IS NULL
         UNION ALL
         SELECT id FROM video_generations WHERE conversation_id=$1 AND deleted_at IS NULL
         LIMIT 1`,
        [conversationId],
      );
      if (!leftover.rowCount) {
        await client.query(
          "UPDATE image_conversations SET deleted_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
          [conversationId, userId],
        );
      }
    }
    return true;
  });
}
