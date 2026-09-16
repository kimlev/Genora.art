import "server-only";

import { automaticDepth, type RoutedDepth } from "@/lib/auto-depth";
import { rankChatRoutes, requestedChatDepth } from "@/lib/chat-auto-route";
import { clampChatDepthForModel, isGemmaChatModel } from "@/lib/chat-request-policy";
import type { Locale } from "@/lib/locale-from-request";
import type { PoolClient } from "pg";
import { query } from "./db";

export type { RoutedDepth };

type RouteCandidate = {
  id: string;
  provider_id: string;
  capabilities: { reasoning?: unknown } | null;
  score: number;
  input_price: number;
  output_price: number;
  latency_ms: number;
};

export async function resolveModelRoute(input: {
  client: PoolClient;
  providerId: string;
  modelId: string;
  depth: "auto" | RoutedDepth;
  prompt: string;
  locale?: Locale | null;
}): Promise<{ providerId: string; modelId: string; depth: RoutedDepth; automatic: boolean }> {
  const providerFilter = input.providerId && input.providerId !== "auto" ? input.providerId : null;
  const modelFilter = input.modelId && input.modelId !== "auto" ? input.modelId : null;
  const rows = await input.client.query<RouteCandidate>(`SELECT m.id,m.provider_id,m.capabilities,
      (m.baseline_score+coalesce(f.score_delta,0))::float8 score,
      m.client_input_per_1m_usd::float8 input_price,m.client_output_per_1m_usd::float8 output_price,
      coalesce(avg(u.latency_ms) FILTER (WHERE u.latency_ms>0),15000)::float8 latency_ms
    FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id
    LEFT JOIN (SELECT model_id,sum(vote)::int score_delta FROM model_feedback GROUP BY model_id) f ON f.model_id=m.id
    LEFT JOIN usage_entries u ON u.model_id=m.id AND u.internal_only=false AND u.created_at>now()-interval '30 days'
    WHERE m.active=true AND p.active=true
      AND coalesce(m.capabilities->>'kind','') NOT IN ('image','video','music','audio')
      AND p.id <> ALL(ARRAY['flux','ideogram']::text[])
      AND ($1::text IS NULL OR m.provider_id=$1 OR lower(p.display_name)=lower($1))
      AND ($2::text IS NULL OR m.id=$2)
    GROUP BY m.id,f.score_delta`, [providerFilter, modelFilter]);
  if (!rows.rows.length) throw new Error("MODEL_NOT_AVAILABLE");
  const requestedDepth = requestedChatDepth(input.prompt, input.depth, input.locale);
  const ranked = rankChatRoutes(rows.rows.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    score: Number(row.score),
    inputPrice: Number(row.input_price),
    outputPrice: Number(row.output_price),
    latencyMs: Number(row.latency_ms),
    supportsReasoning: Boolean(row.capabilities?.reasoning) && !isGemmaChatModel(row.id),
  })), requestedDepth);
  const selected = rows.rows.find((row) => row.id === ranked[0]?.id && row.provider_id === ranked[0]?.providerId);
  if (!selected) throw new Error("MODEL_NOT_AVAILABLE");
  const supportsReasoning = Boolean(selected.capabilities?.reasoning) && !isGemmaChatModel(selected.id);
  const selectedDepth = input.depth === "auto"
    ? automaticDepth(input.prompt, { supportsReasoning, locale: input.locale })
    : input.depth;
  return {
    providerId: selected.provider_id,
    modelId: selected.id,
    depth: clampChatDepthForModel(selected.id, selectedDepth),
    automatic: !providerFilter || !modelFilter || input.depth === "auto",
  };
}

export async function resolveFallbackRoute(input: {
  excludeModelIds: string[];
}): Promise<{ providerId: string; modelId: string; depth: "fast"; automatic: true }> {
  const excluded = input.excludeModelIds.filter(Boolean);
  const rows = await query<{ id: string; provider_id: string }>(`SELECT m.id, m.provider_id
    FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id
    WHERE m.active=true AND p.active=true
      AND m.id <> ALL($1::text[])
      AND coalesce(m.capabilities->>'kind','') NOT IN ('image','video','music','audio')
      AND m.id NOT ILIKE '%image%'
      AND m.id NOT ILIKE '%audio%'
      AND m.id NOT ILIKE '%whisper%'
      AND m.id NOT ILIKE '%tts%'
      AND m.id NOT ILIKE '%pro%'
      AND m.id NOT ILIKE '%o1%'
      AND m.id NOT ILIKE '%o3%'
    ORDER BY
      CASE WHEN m.id ILIKE '%flash%' OR m.id ILIKE '%mini%' OR m.id ILIKE '%haiku%' THEN 0 ELSE 1 END,
      (m.cost_input_per_1m_usd + m.cost_output_per_1m_usd) ASC,
      m.baseline_score DESC NULLS LAST
    LIMIT 1`, [excluded]);
  if (!rows[0]) throw new Error("MODEL_NOT_AVAILABLE");
  return { providerId: rows[0].provider_id, modelId: rows[0].id, depth: "fast", automatic: true };
}
