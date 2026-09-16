import {
  DEFAULT_VIDEO_MULTIPLIER,
  videoCapabilityTags,
  videoDbId,
  videoModelTokenPrices,
} from "@/lib/catalog/video-studio";
import { FALLBACK_VIDEO_MODELS } from "@/lib/catalog/media-catalog";
import { query, withTransaction } from "@/lib/server/db";
import { integratorVideoCatalogFull } from "@/lib/server/integrator";
import { imageCatalogCacheVersion } from "@/lib/server/image-catalog-cache";

export const runtime = "nodejs";

type CatalogPayload = Awaited<ReturnType<typeof buildCatalog>>;
let cached: { version: number; expires: number; value: CatalogPayload } | null = null;
let pending: { version: number; value: Promise<CatalogPayload> } | null = null;

async function catalogPayload() {
  const version = imageCatalogCacheVersion();
  if (cached?.version === version && cached.expires > Date.now()) return cached.value;
  if (pending?.version === version) return pending.value;
  const value = buildCatalog().then((value) => {
    if (version === imageCatalogCacheVersion()) cached = { version, expires: Date.now() + 5_000, value };
    return value;
  }).finally(() => { if (pending?.value === value) pending = null; });
  pending = { version, value };
  return value;
}

async function buildCatalog() {
    const catalog = await integratorVideoCatalogFull();
    await withTransaction(async (client) => {
      for (const [index, provider] of catalog.providers.entries()) {
        await client.query(`INSERT INTO ai_providers(id,display_name,active,sort_order,synced_at)
          VALUES($1,$2,true,$3,now()) ON CONFLICT(id) DO UPDATE SET
          display_name=EXCLUDED.display_name,active=true,synced_at=now(),updated_at=now()`,
        [provider.id, provider.label, (index + 1) * 10]);
      }
      for (const model of catalog.models) {
        const modes = model.modes ?? model.generation_modes ?? [];
        const sound = model.sound_modes ?? model.sound ?? [];
        await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities,synced_at)
          VALUES($1,$2,$3,true,$4,0,0,$5::jsonb,now())
          ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
          capabilities=EXCLUDED.capabilities,synced_at=now(),updated_at=now()`,
        [videoDbId(model.provider, model.id), model.provider, model.label, DEFAULT_VIDEO_MULTIPLIER, JSON.stringify({
          kind: "video",
          modes,
          durations: model.durations,
          resolutions: model.resolutions,
          defaultResolution: model.default_resolution,
          aspectRatios: model.aspect_ratios,
          defaultAspectRatio: model.default_aspect_ratio,
          firstFrame: model.first_frame,
          lastFrame: model.last_frame,
          maxReferenceImages: model.max_reference_images,
          videoToVideo: model.video_to_video,
          personInVideo: model.person_in_video ?? false,
          verifiedAsset: model.person_policy?.verified_asset ?? model.verified_asset ?? "not_documented",
          personPolicy: model.person_policy ?? null,
          motionControl: model.motion_control ?? false,
          sound,
          pricePerSecondUsd: model.price_per_second_usd,
          pricePerSecondWithAudioUsd: model.price_per_second_with_audio_usd,
          billingUnit: model.billing_unit ?? "second",
          averageRequestCostUsd: model.average_request_cost_usd ?? null,
        })]);
      }
    });
    const [providers, models] = await Promise.all([
      query<{ id: string; billing_multiplier: string }>("SELECT id,billing_multiplier FROM ai_providers WHERE active=true"),
      query<{ id: string; markup_multiplier: string }>("SELECT id,markup_multiplier FROM ai_models WHERE active=true"),
    ]);
    const multiplierByProvider = new Map(providers.map((row) => [row.id, Number(row.billing_multiplier)]));
    const multiplierByModel = new Map(models.map((row) => [row.id, Number(row.markup_multiplier)]));
    return {
      available: catalog.models.length > 0,
      providers: catalog.providers,
      models: catalog.models.map((model) => {
        const modes = model.modes ?? model.generation_modes ?? [];
        const sound = model.sound_modes ?? model.sound ?? [];
        const multiplier = multiplierByModel.get(videoDbId(model.provider, model.id))
          ?? multiplierByProvider.get(model.provider)
          ?? DEFAULT_VIDEO_MULTIPLIER;
        return {
          ...model,
          modes,
          sound,
          tags: videoCapabilityTags(modes, sound),
          multiplier,
          ...videoModelTokenPrices(model, multiplier),
        };
      }),
    };
}

export async function GET() {
  try {
    return Response.json(await catalogPayload(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("video_catalog_failed", error instanceof Error ? error.message : "unknown");
    return Response.json({
      available: false,
      providers: [],
      models: FALLBACK_VIDEO_MODELS.map((model) => ({
        id: model.id,
        label: model.name,
        provider: model.provider.toLowerCase(),
        provider_label: model.provider,
        description: model.description,
        modes: [],
        sound: [],
        tags: [],
        token_prices: {},
        tariffs: [],
      })),
    });
  }
}
