import "server-only";

import {
  buildAdminModelRows,
  imageAverageRequestCost,
  providerLabel,
  type AdminModelSource,
  type AdminModelUsage,
} from "@/lib/admin-models";
import { modelDisplayName } from "@/lib/catalog/model-name";
import { query } from "./db";
import { videoDbId } from "@/lib/catalog/video-studio";
import { integratorImageCatalog, integratorModels, integratorVideoCatalog } from "./integrator";

type CatalogRow = {
  id: string;
  display_name: string;
  provider_id: string;
  provider_name: string;
  capabilities: { averageRequestCostUsd?: number | null } | null;
};

type UsageRow = { model: string; model_id: string | null; revenue_usd: string; cost_usd: string };

async function catalogFallback(): Promise<AdminModelSource[]> {
  const rows = await query<CatalogRow>(`SELECT m.id,m.display_name,m.provider_id,p.display_name provider_name,m.capabilities
    FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id
    WHERE m.active=true AND p.active=true`);
  return rows.map((row) => ({
    id: row.id,
    name: row.display_name,
    providerId: row.provider_id,
    provider: row.provider_name,
    source: "text" as const,
    averageRequestCostUsd: row.capabilities?.averageRequestCostUsd ?? null,
  }));
}

export async function getAdminModelsData() {
  const [textModels, imageCatalog, videoCatalog, usageRows] = await Promise.all([
    integratorModels().catch(() => null),
    integratorImageCatalog().catch(() => null),
    integratorVideoCatalog().catch(() => []),
    query<UsageRow>(`SELECT model,model_id,coalesce(sum(revenue_usd),0)::text revenue_usd,coalesce(sum(cost_usd),0)::text cost_usd
      FROM usage_entries GROUP BY model,model_id`),
  ]);
  const usage: AdminModelUsage[] = usageRows.map((row) => ({
    model: row.model,
    modelId: row.model_id,
    revenueUsd: Number(row.revenue_usd),
    costUsd: Number(row.cost_usd),
  }));
  const sources: AdminModelSource[] = [];
  const seen = new Set<string>();
  const add = (source: AdminModelSource) => {
    if (seen.has(source.id)) return;
    seen.add(source.id);
    sources.push(source);
  };

  if (textModels) {
    for (const model of textModels) {
      add({
        id: model.id,
        name: modelDisplayName(model.label),
        providerId: model.provider,
        provider: providerLabel(model.provider),
        source: "text",
        averageRequestCostUsd: model.average_request_cost_usd ?? null,
      });
    }
  } else {
    const fallback = await catalogFallback().catch(() => []);
    fallback.forEach(add);
  }

  for (const model of imageCatalog?.models ?? []) {
    add({
      id: model.id,
      name: model.label,
      providerId: model.provider,
      provider: providerLabel(model.provider, model.provider_label),
      source: "image",
      averageRequestCostUsd: imageAverageRequestCost(model),
    });
  }

  for (const model of videoCatalog) {
    add({
      id: videoDbId(model.provider, model.id),
      name: model.label,
      providerId: model.provider,
      provider: providerLabel(model.provider, model.provider_label),
      source: "video",
      averageRequestCostUsd: model.average_request_cost_usd ?? null,
    });
  }

  const rows = buildAdminModelRows(sources, usage);
  const providers = [...new Map(rows.filter((row) => row.providerId).map((row) => [row.providerId, { id: row.providerId, name: row.provider }])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  const models = rows.map((row) => ({ id: row.modelId, name: row.model, providerId: row.providerId, kind: row.kind }))
    .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  return { rows, providers, models };
}
