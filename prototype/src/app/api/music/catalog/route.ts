import {
  DEFAULT_MUSIC_MULTIPLIER,
  fallbackMusicModes,
  musicDbId,
  musicModelMultiplier,
  musicModelTokenPrices,
} from "@/lib/catalog/music-studio";
import { FALLBACK_MUSIC_MODELS } from "@/lib/catalog/media-catalog";
import { query, withTransaction } from "@/lib/server/db";
import { integratorMusicCatalogFull } from "@/lib/server/integrator";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = await integratorMusicCatalogFull();
    await withTransaction(async (client) => {
      for (const [index, provider] of catalog.providers.entries()) {
        await client.query(`INSERT INTO ai_providers(id,display_name,active,sort_order,synced_at)
          VALUES($1,$2,true,$3,now()) ON CONFLICT(id) DO UPDATE SET
          display_name=EXCLUDED.display_name,active=true,synced_at=now(),updated_at=now()`,
        [provider.id, provider.label, (index + 1) * 10]);
      }
      for (const model of catalog.models) {
        const multiplier = musicModelMultiplier(model.provider, DEFAULT_MUSIC_MULTIPLIER);
        await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities,synced_at)
          VALUES($1,$2,$3,true,$4,0,0,$5::jsonb,now())
          ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,display_name=EXCLUDED.display_name,active=true,
          markup_multiplier=CASE WHEN EXCLUDED.provider_id='minimax' THEN EXCLUDED.markup_multiplier ELSE ai_models.markup_multiplier END,
          capabilities=EXCLUDED.capabilities,synced_at=now(),updated_at=now()`,
        [musicDbId(model.provider, model.id), model.provider, model.label, multiplier, JSON.stringify({
          kind: "music",
          modes: model.modes,
          durations: model.durations,
          durationControl: model.duration_control,
          vocalOptions: model.vocal_options,
        })]);
      }
    });
    const [providers, models] = await Promise.all([
      query<{ id: string; billing_multiplier: string }>("SELECT id,billing_multiplier FROM ai_providers WHERE active=true"),
      query<{ id: string; markup_multiplier: string }>("SELECT id,markup_multiplier FROM ai_models WHERE active=true"),
    ]);
    const multiplierByProvider = new Map(providers.map((row) => [row.id, Number(row.billing_multiplier)]));
    const multiplierByModel = new Map(models.map((row) => [row.id, Number(row.markup_multiplier)]));
    return Response.json({
      available: catalog.models.length > 0,
      providers: catalog.providers,
      genres: catalog.genres ?? [],
      styles: catalog.styles ?? [],
      moods: catalog.moods ?? [],
      purposes: catalog.purposes ?? [],
      languages: catalog.languages ?? [],
      models: catalog.models.map((model) => {
        const multiplier = musicModelMultiplier(
          model.provider,
          multiplierByModel.get(musicDbId(model.provider, model.id))
            ?? multiplierByProvider.get(model.provider)
            ?? DEFAULT_MUSIC_MULTIPLIER,
        );
        return {
          ...model,
          multiplier,
          ...musicModelTokenPrices(model, multiplier),
        };
      }),
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("music_catalog_failed", error instanceof Error ? error.message : "unknown");
    return Response.json({
      available: false,
      providers: [],
      genres: [],
      styles: [],
      moods: [],
      purposes: [],
      languages: [],
      models: FALLBACK_MUSIC_MODELS.map((model) => ({
        id: model.id,
        label: model.name,
        provider: model.provider.toLowerCase(),
        available: true,
        provider_label: model.provider,
        description: model.description,
        modes: fallbackMusicModes(model.id),
        durations: [30, 60, 90, 120, 180],
        default_duration: 120,
        lyrics: true,
        vocal_options: ["auto", "female", "male"],
        duration_control: model.provider !== "Mureka",
        languages: ["auto", "ru", "en"],
        token_prices: {},
        token_price_auto: null,
      })),
    });
  }
}
