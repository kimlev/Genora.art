import "server-only";

import { commercialMarkup, commercialModels, type CommercialModel } from "@/lib/catalog/commercial-models";
import { isImageCatalogModel, isMusicCatalogModel, isVideoCatalogModel } from "@/lib/catalog/model-kind";
import { getCommercialModelMetrics } from "@/lib/model-metrics";
import { query, withTransaction } from "./db";

type CatalogRow = {
  id: string;
  display_name: string;
  provider_id: string;
  provider_name: string;
  client_input_per_1m_usd: string;
  client_cached_input_per_1m_usd: string | null;
  client_output_per_1m_usd: string;
  score: string;
  votes: string;
  capabilities: { kind?: string; reasoning?: unknown; averageRequestCostUsd?: number | null } | null;
  billing_multiplier: string;
  tokens_used: string;
  synced_at: Date;
};

declare global {
  var genoraCatalogSeed: Promise<void> | undefined;
}

function providerId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function seedCatalog(): Promise<void> {
  await withTransaction(async (client) => {
    const providers = [...new Set(commercialModels.map((model) => model.provider))];
    for (const [index, name] of providers.entries()) {
      await client.query(`INSERT INTO ai_providers(id,display_name,sort_order)
        VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING`, [providerId(name), name, (index + 1) * 10]);
    }
    for (const model of commercialModels) {
      const metrics = getCommercialModelMetrics(model);
      await client.query(`INSERT INTO ai_models(id,provider_id,display_name,cost_input_per_1m_usd,cost_cached_input_per_1m_usd,
        cost_output_per_1m_usd,client_input_per_1m_usd,client_cached_input_per_1m_usd,client_output_per_1m_usd,
        markup_multiplier,baseline_score,baseline_votes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING`, [
        model.id, providerId(model.provider), model.name, model.inputPer1MUsd / commercialMarkup,
        model.cachedInputPer1MUsd === undefined ? null : model.cachedInputPer1MUsd / commercialMarkup,
        model.outputPer1MUsd / commercialMarkup, model.inputPer1MUsd, model.cachedInputPer1MUsd ?? null,
        model.outputPer1MUsd, commercialMarkup, metrics.score, metrics.votes,
      ]);
      await client.query(`UPDATE ai_models SET baseline_score=$2,baseline_votes=$3,updated_at=now()
        WHERE id=$1 AND (baseline_score<>$2 OR baseline_votes<>$3)`, [model.id, metrics.score, metrics.votes]);
    }
    const incomplete = await client.query<{ id: string; display_name: string }>(
      "SELECT id,display_name FROM ai_models WHERE active=true AND baseline_votes=0",
    );
    for (const model of incomplete.rows) {
      const previous = await client.query<{ baseline_score: string; baseline_votes: string }>(`SELECT baseline_score::text,baseline_votes::text
        FROM ai_models WHERE display_name=$1 AND baseline_votes>0 ORDER BY active DESC,updated_at DESC LIMIT 1`, [model.display_name]);
      const generated = getCommercialModelMetrics({ id: model.id, name: model.display_name });
      await client.query(`UPDATE ai_models SET baseline_score=$2,baseline_votes=$3,updated_at=now() WHERE id=$1`, [
        model.id,
        Number(previous.rows[0]?.baseline_score ?? generated.score),
        Number(previous.rows[0]?.baseline_votes ?? generated.votes),
      ]);
    }
  });
}

export async function ensureCatalogSeed(): Promise<void> {
  globalThis.genoraCatalogSeed ??= seedCatalog().catch((error) => {
    globalThis.genoraCatalogSeed = undefined;
    throw error;
  });
  await globalThis.genoraCatalogSeed;
}

export async function getCatalogData(userId: string | null = null, options: { includeImages?: boolean } = {}): Promise<{ models: Array<CommercialModel & { score: number; votes: number; capabilities: { kind?: string; reasoning?: unknown; averageRequestCostUsd?: number | null } | null; averageRequestCostUsd: number | null; billingMultiplier: number; tokensUsed: number }>; providers: Array<{ id: string; name: string }>; syncedAt: string }> {
  await ensureCatalogSeed();
  const includeImages = Boolean(options.includeImages);
  const excludedProviders = includeImages ? [] : ["flux", "ideogram"];
  const rows = await query<CatalogRow>(`WITH usage_resolved AS (
      SELECT ue.user_id,ue.battle_id,ue.billed_tokens,
        coalesce(
          (SELECT id FROM ai_models x WHERE x.id=ue.model_id LIMIT 1),
          (SELECT id FROM ai_models x WHERE x.id='music:'||ue.provider||':'||ue.model_id LIMIT 1),
          (SELECT id FROM ai_models x WHERE x.id='video:'||ue.provider||':'||ue.model_id LIMIT 1),
          (SELECT id FROM ai_models x WHERE x.display_name=ue.model LIMIT 1)
        ) model_id
      FROM usage_entries ue
      WHERE ue.internal_only=false AND ($1::uuid IS NULL OR ue.user_id=$1::uuid)
    ), usage_activity AS (
      SELECT model_id,count(*)::int usage_count
      FROM usage_resolved WHERE model_id IS NOT NULL
      GROUP BY model_id
    ), arena_activity AS (
      SELECT model_id,count(*)::int vote_count
      FROM usage_resolved WHERE model_id IS NOT NULL AND battle_id IS NOT NULL
      GROUP BY model_id
    ), battle_votes AS (
      SELECT CASE WHEN preferred_side='left' THEN left_model ELSE right_model END model_id,count(*)::int vote_count
      FROM model_battles WHERE preferred_side IS NOT NULL AND ($1::uuid IS NULL OR user_id=$1::uuid) GROUP BY 1
    ), feedback_votes AS (
      SELECT coalesce(
          (SELECT id FROM ai_models x WHERE x.id=mf.model_id LIMIT 1),
          am.id
        ) model_id,
        count(*) FILTER (WHERE mf.vote=1)::int positive_count
      FROM model_feedback mf LEFT JOIN ai_models am ON am.display_name=mf.model_name
      WHERE ($1::uuid IS NULL OR mf.user_id=$1::uuid)
      GROUP BY 1
    ), token_spend AS (
      SELECT model_id,coalesce(sum(billed_tokens),0)::bigint tokens_used
      FROM usage_resolved WHERE $1::uuid IS NOT NULL AND model_id IS NOT NULL
      GROUP BY model_id
    )
    SELECT m.id,m.display_name,m.provider_id,p.display_name provider_name,m.client_input_per_1m_usd,
      m.client_cached_input_per_1m_usd,m.client_output_per_1m_usd,m.capabilities,p.billing_multiplier,
      ((CASE
          WHEN $1::uuid IS NOT NULL AND coalesce(m.capabilities->>'kind','') IN ('image','music','video')
            THEN 5*coalesce(f.positive_count,0)
          WHEN $1::uuid IS NULL THEN m.baseline_score
          ELSE 0
        END)
        + CASE
          WHEN $1::uuid IS NOT NULL AND coalesce(m.capabilities->>'kind','') IN ('image','music','video') THEN 0
          ELSE coalesce(u.usage_count,0)
        END)::text score,
      ((CASE
          WHEN $1::uuid IS NOT NULL AND coalesce(m.capabilities->>'kind','') IN ('image','music','video')
            THEN coalesce(u.usage_count,0)
          WHEN $1::uuid IS NULL THEN m.baseline_votes
          ELSE 0
        END)
        + CASE
          WHEN $1::uuid IS NOT NULL AND coalesce(m.capabilities->>'kind','') IN ('image','music','video') THEN 0
          ELSE coalesce(a.vote_count,0)+5*coalesce(b.vote_count,0)
        END)::text votes,
      coalesce(t.tokens_used,0)::text tokens_used,
      greatest(m.synced_at,p.synced_at) synced_at
    FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id
    LEFT JOIN usage_activity u ON u.model_id=m.id LEFT JOIN arena_activity a ON a.model_id=m.id
    LEFT JOIN battle_votes b ON b.model_id=m.id
    LEFT JOIN feedback_votes f ON f.model_id=m.id
    LEFT JOIN token_spend t ON t.model_id=m.id
    WHERE m.active=true AND p.active=true
      AND ($3::boolean OR (
        coalesce(m.capabilities->>'kind','') <> ALL('{image,music,video}'::text[])
        AND p.id <> ALL($2::text[])
      ))
    ORDER BY p.sort_order,m.display_name`, [userId, excludedProviders, includeImages]);
  const visibleRows = includeImages ? rows : rows.filter((row) => !isImageCatalogModel({
    id: row.id,
    provider: row.provider_name,
    providerId: row.provider_id,
    capabilities: row.capabilities,
  }) && !isMusicCatalogModel({
    id: row.id,
    provider: row.provider_name,
    providerId: row.provider_id,
    capabilities: row.capabilities,
  }) && !isVideoCatalogModel({
    id: row.id,
    capabilities: row.capabilities,
  }));
  const providers = [...new Map(visibleRows.map((row) => [row.provider_id, { id: row.provider_id, name: row.provider_name }])).values()];
  const syncedAt = visibleRows.reduce((latest, row) => row.synced_at > latest ? row.synced_at : latest, new Date(0));
  return {
    providers,
    models: visibleRows.map((row) => ({
      id: row.id,
      name: row.display_name,
      provider: row.provider_name,
      inputPer1MUsd: Number(row.client_input_per_1m_usd),
      cachedInputPer1MUsd: row.client_cached_input_per_1m_usd === null ? undefined : Number(row.client_cached_input_per_1m_usd),
      outputPer1MUsd: Number(row.client_output_per_1m_usd),
      score: Number(row.score),
      votes: Number(row.votes),
      capabilities: row.capabilities,
      averageRequestCostUsd: row.capabilities?.averageRequestCostUsd ?? null,
      billingMultiplier: Number(row.billing_multiplier ?? 1),
      tokensUsed: Number(row.tokens_used),
    })),
    syncedAt: syncedAt.toISOString(),
  };
}

export type CatalogPricingRow = {
  id: string;
  display_name: string;
  provider_id: string;
  provider_name: string;
  cost_input_per_1m_usd: string;
  cost_output_per_1m_usd: string;
  client_input_per_1m_usd: string;
  client_output_per_1m_usd: string;
  billing_multiplier: string;
  pricing_change_id: string | null;
};

export async function catalogPricing(modelId: string): Promise<CatalogPricingRow | null> {
  await ensureCatalogSeed();
  const rows = await query<CatalogPricingRow>(`SELECT m.id,m.display_name,p.id provider_id,p.display_name provider_name,m.cost_input_per_1m_usd,
    m.cost_output_per_1m_usd,m.client_input_per_1m_usd,m.client_output_per_1m_usd,p.billing_multiplier,
    (SELECT id::text FROM pricing_multiplier_changes pmc WHERE pmc.provider_id=p.id ORDER BY created_at DESC,id DESC LIMIT 1) pricing_change_id
    FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id
    WHERE m.id=$1 AND m.active=true AND p.active=true`, [modelId]);
  return rows[0] ?? null;
}
