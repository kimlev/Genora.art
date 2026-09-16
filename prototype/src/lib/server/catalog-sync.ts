import "server-only";

import { commercialMarkup, commercialModels } from "@/lib/catalog/commercial-models";
import { integratorImageCatalog, integratorModels, integratorMusicCatalog, integratorVideoCatalog } from "./integrator";
import { DEFAULT_MUSIC_MULTIPLIER, MUSIC_TAG_SETS, musicDbId, musicModelMultiplier } from "@/lib/catalog/music-studio";
import { DEFAULT_VIDEO_MULTIPLIER, videoDbId } from "@/lib/catalog/video-studio";
import { withTransaction } from "./db";
import { modelDisplayName } from "@/lib/catalog/model-name";
import { getCommercialModelMetrics } from "@/lib/model-metrics";

function destProviderId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI", anthropic: "Anthropic", google: "Google", kimi: "Kimi", xai: "xAI", alibaba: "Alibaba",
  deepseek: "DeepSeek", meta: "Meta", minimax: "MiniMax", flux: "Black Forest Labs", ideogram: "Ideogram",
  elevenlabs: "ElevenLabs", mureka: "Mureka", sonilo: "Sonilo",
  kling: "Kling", runway: "Runway", bytedance: "ByteDance",
};

/** These models are service dependencies, never customer-selectable catalog entries. */
const INTERNAL_ONLY_CHAT_MODEL_IDS = new Set(["qwen3.5-omni-plus"]);

export async function syncIntegratorCatalog(): Promise<{ providers: number; models: number }> {
  const [models, imageCatalog, musicModels, videoModels] = await Promise.all([
    integratorModels(),
    integratorImageCatalog().catch(() => null),
    integratorMusicCatalog().catch(() => []),
    integratorVideoCatalog().catch(() => null),
  ]);
  const imageProviderNames = new Map((imageCatalog?.providers ?? []).map((provider) => [provider.id, provider.label]));
  const publicModels = models.filter((model) => model.usage_policy?.resale_allowed !== false && !INTERNAL_ONLY_CHAT_MODEL_IDS.has(model.id));
  const internalModelIds = new Set([
    ...INTERNAL_ONLY_CHAT_MODEL_IDS,
    ...models.filter((model) => model.usage_policy?.resale_allowed === false).map((model) => model.id),
  ]);
  const imageModels = imageCatalog?.models ?? [];
  const visibleVideo = videoModels ?? [];
  const providerIds = [...new Set([
    ...publicModels.map((model) => model.provider),
    ...(imageCatalog?.providers ?? []).map((provider) => provider.id),
    ...musicModels.map((model) => model.provider),
    ...visibleVideo.map((model) => model.provider),
  ])];
  await withTransaction(async (client) => {
    for (const [index, providerId] of providerIds.entries()) {
      await client.query(`INSERT INTO ai_providers(id,display_name,active,sort_order,synced_at)
        VALUES($1,$2,true,$3,now()) ON CONFLICT(id) DO UPDATE SET
        display_name=EXCLUDED.display_name,active=true,sort_order=EXCLUDED.sort_order,synced_at=now(),updated_at=now()`,
      [providerId, PROVIDER_NAMES[providerId] ?? imageProviderNames.get(providerId) ?? providerId, (index + 1) * 10]);
    }
    // A temporary image-catalog outage must not deactivate image-only providers.
    if (providerIds.length && imageCatalog) {
      await client.query("UPDATE ai_providers SET active=false,synced_at=now(),updated_at=now() WHERE NOT(id=ANY($1::text[]))", [providerIds]);
    }
    for (const model of publicModels) {
      const displayName = modelDisplayName(model.label);
      const metrics = getCommercialModelMetrics({ id: model.id, name: displayName });
      const provider = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1", [model.provider]);
      const multiplier = Number(provider.rows[0]?.billing_multiplier ?? 2.5);
      const cached = model.pricing.cached_input_per_1m_usd;
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,cost_input_per_1m_usd,cost_cached_input_per_1m_usd,
        cost_output_per_1m_usd,client_input_per_1m_usd,client_cached_input_per_1m_usd,client_output_per_1m_usd,markup_multiplier,
        baseline_score,baseline_votes,capabilities,source_updated_at,synced_at) VALUES($1,$2,$3,true,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
        ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
        cost_input_per_1m_usd=EXCLUDED.cost_input_per_1m_usd,cost_cached_input_per_1m_usd=EXCLUDED.cost_cached_input_per_1m_usd,
        cost_output_per_1m_usd=EXCLUDED.cost_output_per_1m_usd,
        client_input_per_1m_usd=EXCLUDED.cost_input_per_1m_usd*ai_models.markup_multiplier,
        client_cached_input_per_1m_usd=CASE WHEN EXCLUDED.cost_cached_input_per_1m_usd IS NULL THEN NULL ELSE EXCLUDED.cost_cached_input_per_1m_usd*ai_models.markup_multiplier END,
        client_output_per_1m_usd=EXCLUDED.cost_output_per_1m_usd*ai_models.markup_multiplier,
        markup_multiplier=ai_models.markup_multiplier,capabilities=EXCLUDED.capabilities,source_updated_at=EXCLUDED.source_updated_at,
        baseline_score=CASE WHEN ai_models.baseline_votes=0 THEN EXCLUDED.baseline_score ELSE ai_models.baseline_score END,
        baseline_votes=CASE WHEN ai_models.baseline_votes=0 THEN EXCLUDED.baseline_votes ELSE ai_models.baseline_votes END,
        synced_at=now(),updated_at=now()`, [model.id, model.provider, displayName, model.pricing.input_per_1m_usd, cached,
        model.pricing.output_per_1m_usd, model.pricing.input_per_1m_usd * multiplier,
        cached === null ? null : cached * multiplier, model.pricing.output_per_1m_usd * multiplier, multiplier,
        metrics.score, metrics.votes,
        { temperature: model.temperature, topP: model.top_p, reasoning: model.reasoning, pricingSource: model.pricing.source, pricingSourceUrl: model.pricing.source_url, averageRequestCostUsd: model.average_request_cost_usd, videoInputAnalysis: model.video_input_analysis ?? null },
        new Date(model.pricing.verified_at)]);
    }
    for (const model of imageModels) {
      const provider = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1", [model.provider]);
      const multiplier = Number(provider.rows[0]?.billing_multiplier ?? 2.5);
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities,synced_at)
        VALUES($1,$2,$3,true,$4,0,0,$5::jsonb,now())
        ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
        markup_multiplier=ai_models.markup_multiplier,synced_at=now(),updated_at=now()`,
        [model.id, model.provider, model.label, multiplier, JSON.stringify({ kind: "image", averageRequestCostUsd: model.average_request_cost_usd ?? null })]);
    }
    for (const model of musicModels) {
      const id = musicDbId(model.provider, model.id);
      const multiplier = musicModelMultiplier(model.provider, DEFAULT_MUSIC_MULTIPLIER);
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities,synced_at)
        VALUES($1,$2,$3,true,$4,0,0,$5::jsonb,now())
        ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
        markup_multiplier=CASE WHEN EXCLUDED.provider_id='minimax' THEN EXCLUDED.markup_multiplier ELSE ai_models.markup_multiplier END,
        capabilities=EXCLUDED.capabilities,synced_at=now(),updated_at=now()`,
      [id, model.provider, model.label, multiplier, JSON.stringify({
        kind: "music",
        modes: model.modes,
        durations: model.durations,
        durationControl: model.duration_control,
        vocalOptions: model.vocal_options,
        languages: model.languages,
        billingUnit: model.billing_unit,
        averageRequestCostUsd: model.average_request_cost_usd ?? null,
      })]);
    }
    for (const model of visibleVideo) {
      const modes = model.modes ?? model.generation_modes ?? [];
      const sound = model.sound_modes ?? model.sound ?? [];
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities,synced_at)
        VALUES($1,$2,$3,true,$4,0,0,$5::jsonb,now())
        ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
        markup_multiplier=ai_models.markup_multiplier,capabilities=EXCLUDED.capabilities,synced_at=now(),updated_at=now()`,
      [videoDbId(model.provider, model.id), model.provider, model.label, DEFAULT_VIDEO_MULTIPLIER, JSON.stringify({
        kind: "video",
        modes,
        durations: model.durations,
        resolutions: model.resolutions,
        defaultResolution: model.default_resolution,
        videoToVideo: model.video_to_video,
        personInVideo: model.person_in_video ?? false,
        motionControl: model.motion_control ?? false,
        maxReferenceImages: model.max_reference_images ?? 0,
        sound,
        pricePerSecondUsd: model.price_per_second_usd,
        pricePerSecondWithAudioUsd: model.price_per_second_with_audio_usd,
        billingUnit: model.billing_unit ?? "second",
        averageRequestCostUsd: model.average_request_cost_usd ?? null,
      })]);
    }
    const knownIds = new Set([
      ...publicModels.map((model) => model.id),
      ...imageModels.map((model) => model.id),
      ...musicModels.map((model) => musicDbId(model.provider, model.id)),
      ...visibleVideo.map((model) => videoDbId(model.provider, model.id)),
    ]);
    if (!videoModels) {
      const existingVideo = await client.query<{ id: string }>("SELECT id FROM ai_models WHERE id LIKE 'video:%'");
      for (const row of existingVideo.rows) knownIds.add(row.id);
    }
    for (const model of commercialModels) {
      if (knownIds.has(model.id) || internalModelIds.has(model.id)) continue;
      const providerId = destProviderId(model.provider);
      await client.query(`INSERT INTO ai_providers(id,display_name,active,sort_order,synced_at)
        VALUES($1,$2,true,$3,now()) ON CONFLICT(id) DO UPDATE SET active=true,synced_at=now(),updated_at=now()`,
        [providerId, PROVIDER_NAMES[providerId] ?? model.provider, (providerIds.length + 1) * 10]);
      const provider = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1", [providerId]);
      const multiplier = Number(provider.rows[0]?.billing_multiplier ?? 2.5);
      const metrics = getCommercialModelMetrics(model);
      const costIn = model.inputPer1MUsd / commercialMarkup;
      const costCached = model.cachedInputPer1MUsd === undefined ? null : model.cachedInputPer1MUsd / commercialMarkup;
      const costOut = model.outputPer1MUsd / commercialMarkup;
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,cost_input_per_1m_usd,cost_cached_input_per_1m_usd,
        cost_output_per_1m_usd,client_input_per_1m_usd,client_cached_input_per_1m_usd,client_output_per_1m_usd,markup_multiplier,
        baseline_score,baseline_votes,synced_at) VALUES($1,$2,$3,true,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
        cost_input_per_1m_usd=EXCLUDED.cost_input_per_1m_usd,cost_cached_input_per_1m_usd=EXCLUDED.cost_cached_input_per_1m_usd,
        cost_output_per_1m_usd=EXCLUDED.cost_output_per_1m_usd,
        client_input_per_1m_usd=EXCLUDED.cost_input_per_1m_usd*ai_models.markup_multiplier,
        client_cached_input_per_1m_usd=CASE WHEN EXCLUDED.cost_cached_input_per_1m_usd IS NULL THEN NULL ELSE EXCLUDED.cost_cached_input_per_1m_usd*ai_models.markup_multiplier END,
        client_output_per_1m_usd=EXCLUDED.cost_output_per_1m_usd*ai_models.markup_multiplier,
        markup_multiplier=ai_models.markup_multiplier,
        baseline_score=CASE WHEN ai_models.baseline_votes=0 THEN EXCLUDED.baseline_score ELSE ai_models.baseline_score END,
        baseline_votes=CASE WHEN ai_models.baseline_votes=0 THEN EXCLUDED.baseline_votes ELSE ai_models.baseline_votes END,
        synced_at=now(),updated_at=now()`, [
        model.id, providerId, model.name, costIn, costCached, costOut,
        costIn * multiplier, costCached === null ? null : costCached * multiplier, costOut * multiplier,
        multiplier, metrics.score, metrics.votes,
      ]);
      knownIds.add(model.id);
    }
    const modelIds = [...knownIds];
    if (modelIds.length) await client.query("UPDATE ai_models SET active=false,synced_at=now(),updated_at=now() WHERE NOT(id=ANY($1::text[]))", [modelIds]);
  });
  await withTransaction(async (client) => {
    for (const { kind, tags } of MUSIC_TAG_SETS) {
      for (const tag of tags) {
        await client.query(
          `INSERT INTO music_tag_prompts(kind,id,label_ru,label_en,prompt_en,updated_at)
           VALUES($1,$2,$3,$4,$5,now())
           ON CONFLICT(kind,id) DO UPDATE SET label_ru=EXCLUDED.label_ru,label_en=EXCLUDED.label_en,prompt_en=EXCLUDED.prompt_en,updated_at=now()`,
          [kind, tag.id, tag.label, tag.labelEn, tag.promptEn],
        );
      }
    }
  }).catch((error) => {
    console.error("music_tag_prompts_sync_failed", error instanceof Error ? error.message : "unknown");
  });
  return { providers: providerIds.length, models: publicModels.length + imageModels.length + musicModels.length + visibleVideo.length };
}
