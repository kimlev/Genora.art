import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { classifyModelKind, type AdminModelKind } from "@/lib/admin-models";
import { invalidateImageCatalogCache } from "@/lib/server/image-catalog-cache";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { query, withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { DEFAULT_VIDEO_MULTIPLIER, videoDbId } from "@/lib/catalog/video-studio";
import { integratorImageCatalog, integratorVideoCatalog } from "@/lib/server/integrator";
import { syncIntegratorCatalog } from "@/lib/server/catalog-sync";

export const runtime = "nodejs";

type ProviderRow = { id: string; display_name: string; billing_multiplier: string };
type ModelRow = { id: string; provider_id: string; display_name: string; markup_multiplier: string; capabilities: { kind?: string } | null };
type HistoryRow = {
  id: string;
  batch_id: string;
  requested_scope: string;
  provider_id: string;
  display_name: string;
  previous_multiplier: string;
  new_multiplier: string;
  affected_models: number;
  created_at: Date;
  admin_email: string | null;
  affected_users: string;
  usage_events: string;
};

const valid = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;

function parseOverrides(value: unknown): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: {} };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Некорректные множители" };
  const next: Record<string, number> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(raw);
    if (!valid(parsed)) return { ok: false, error: "Множитель должен быть от 0 до 100" };
    next[id] = parsed;
  }
  return { ok: true, value: next };
}

function parseModelOverrides(value: unknown): { ok: true; value: Array<{ id: string; providerId: string; multiplier: number }> } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: "Некорректные множители моделей" };
  const next: Array<{ id: string; providerId: string; multiplier: number }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return { ok: false, error: "Некорректные множители моделей" };
    const id = String((item as { id?: unknown }).id ?? "").trim();
    const providerId = String((item as { providerId?: unknown }).providerId ?? "").trim();
    const multiplier = Number((item as { multiplier?: unknown }).multiplier);
    if (!id || !providerId || !valid(multiplier)) return { ok: false, error: "Множитель должен быть от 0 до 100" };
    next.push({ id, providerId, multiplier });
  }
  return { ok: true, value: next };
}

export async function GET() {
  try {
    await requireAdmin();
    const [providers, models, history, imageCatalog, videoCatalog] = await Promise.all([
      query<ProviderRow>(`SELECT id,display_name,billing_multiplier FROM ai_providers ORDER BY sort_order,display_name`),
      query<ModelRow>(`SELECT id,provider_id,display_name,markup_multiplier,capabilities FROM ai_models WHERE active=true ORDER BY display_name`),
      query<HistoryRow>(`SELECT c.id::text,c.batch_id::text,c.requested_scope,c.provider_id,p.display_name,c.previous_multiplier,c.new_multiplier,
        c.affected_models,c.created_at,a.email admin_email,count(DISTINCT ue.user_id)::text affected_users,count(ue.id)::text usage_events
        FROM pricing_multiplier_changes c JOIN ai_providers p ON p.id=c.provider_id LEFT JOIN administrators a ON a.id=c.administrator_id
        LEFT JOIN usage_entries ue ON ue.pricing_change_id=c.id GROUP BY c.id,p.display_name,a.email ORDER BY c.created_at DESC,c.id DESC LIMIT 200`),
      integratorImageCatalog().catch(() => null),
      integratorVideoCatalog().catch(() => []),
    ]);
    const itemsByProvider = new Map<string, Array<{ id: string; name: string; kind: AdminModelKind; multiplier: number }>>();
    const seen = new Set<string>();
    const add = (providerId: string, item: { id: string; name: string; kind: AdminModelKind; multiplier: number }) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      const list = itemsByProvider.get(providerId) ?? [];
      list.push(item);
      itemsByProvider.set(providerId, list);
    };
    const imageIds = new Set((imageCatalog?.models ?? []).map((model) => model.id));
    const videoIds = new Set((videoCatalog ?? []).map((model) => videoDbId(model.provider, model.id)));
    const kindOf = (id: string, cap?: string | null): AdminModelKind => {
      if (cap === "image" || imageIds.has(id)) return "image";
      if (cap === "video" || id.startsWith("video:") || videoIds.has(id)) return "video";
      if (cap === "music" || cap === "audio") return "audio";
      return classifyModelKind(id, "text");
    };
    for (const row of models) {
      add(row.provider_id, {
        id: row.id,
        name: row.display_name,
        kind: kindOf(row.id, row.capabilities?.kind),
        multiplier: Number(row.markup_multiplier),
      });
    }
    const providerMultiplier = new Map(providers.map((row) => [row.id, Number(row.billing_multiplier)]));
    for (const model of imageCatalog?.models ?? []) {
      add(model.provider, {
        id: model.id,
        name: model.label,
        kind: "image",
        multiplier: providerMultiplier.get(model.provider) ?? 2.5,
      });
    }
    for (const model of videoCatalog ?? []) {
      add(model.provider, {
        id: videoDbId(model.provider, model.id),
        name: model.label,
        kind: "video",
        multiplier: providerMultiplier.get(model.provider) ?? DEFAULT_VIDEO_MULTIPLIER,
      });
    }
    return Response.json({
      providers: providers.map((row) => {
        const items = (itemsByProvider.get(row.id) ?? []).sort((left, right) => left.name.localeCompare(right.name, "ru"));
        return { id: row.id, name: row.display_name, multiplier: Number(row.billing_multiplier), models: items.length, items };
      }),
      history: history.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        scope: row.requested_scope,
        providerId: row.provider_id,
        providerName: row.display_name,
        previousMultiplier: Number(row.previous_multiplier),
        newMultiplier: Number(row.new_multiplier),
        affectedModels: row.affected_models,
        createdAt: row.created_at.toISOString(),
        adminEmail: row.admin_email,
        affectedUsers: Number(row.affected_users),
        usageEvents: Number(row.usage_events),
      })),
    });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    return jsonError("Не удалось загрузить множители", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { providers?: unknown; models?: unknown } | null;
    const providerOverrides = parseOverrides(body?.providers);
    if (!providerOverrides.ok) return jsonError(providerOverrides.error);
    const modelOverrides = parseModelOverrides(body?.models);
    if (!modelOverrides.ok) return jsonError(modelOverrides.error);
    if (!Object.keys(providerOverrides.value).length && !modelOverrides.value.length) return jsonError("Нет изменений");
    const batchId = randomUUID();
    const changed = await withTransaction(async (client) => {
      const providers = await client.query<{ id: string; billing_multiplier: string }>("SELECT id,billing_multiplier FROM ai_providers ORDER BY sort_order FOR UPDATE");
      let changedProviders = 0;
      let changedModels = 0;
      for (const provider of providers.rows) {
        const requested = providerOverrides.value[provider.id];
        if (requested === undefined || requested === Number(provider.billing_multiplier)) continue;
        const models = await client.query<{ count: string }>("SELECT count(*)::text count FROM ai_models WHERE provider_id=$1 AND active=true", [provider.id]);
        await client.query(`INSERT INTO pricing_multiplier_changes(batch_id,administrator_id,requested_scope,provider_id,previous_multiplier,new_multiplier,affected_models)
          VALUES($1,$2,'provider',$3,$4,$5,$6)`, [batchId, admin.id, provider.id, Number(provider.billing_multiplier), requested, Number(models.rows[0]?.count ?? 0)]);
        await client.query("UPDATE ai_providers SET billing_multiplier=$2,updated_at=now() WHERE id=$1", [provider.id, requested]);
        await client.query(`UPDATE ai_models SET markup_multiplier=$2,client_input_per_1m_usd=cost_input_per_1m_usd*$2,
          client_cached_input_per_1m_usd=CASE WHEN cost_cached_input_per_1m_usd IS NULL THEN NULL ELSE cost_cached_input_per_1m_usd*$2 END,
          client_output_per_1m_usd=cost_output_per_1m_usd*$2,updated_at=now() WHERE provider_id=$1`, [provider.id, requested]);
        changedProviders++;
      }
      for (const item of modelOverrides.value) {
        const current = await client.query<{ markup_multiplier: string }>(
          "SELECT markup_multiplier FROM ai_models WHERE id=$1 FOR UPDATE",
          [item.id],
        );
        if (current.rowCount) {
          if (Number(current.rows[0].markup_multiplier) === item.multiplier) continue;
          await client.query(`UPDATE ai_models SET markup_multiplier=$2,client_input_per_1m_usd=cost_input_per_1m_usd*$2,
            client_cached_input_per_1m_usd=CASE WHEN cost_cached_input_per_1m_usd IS NULL THEN NULL ELSE cost_cached_input_per_1m_usd*$2 END,
            client_output_per_1m_usd=cost_output_per_1m_usd*$2,updated_at=now() WHERE id=$1`, [item.id, item.multiplier]);
          changedModels++;
          continue;
        }
        await client.query(`INSERT INTO ai_models(id,provider_id,display_name,active,markup_multiplier,client_input_per_1m_usd,client_output_per_1m_usd,capabilities)
          VALUES($1,$2,$1,true,$3,0,0,$4::jsonb)
          ON CONFLICT(id) DO UPDATE SET provider_id=EXCLUDED.provider_id,markup_multiplier=EXCLUDED.markup_multiplier,active=true,updated_at=now()`,
        [item.id, item.providerId, item.multiplier, JSON.stringify({ kind: "image" })]);
        changedModels++;
      }
      return { changedProviders, changedModels };
    });
    const synced = await syncIntegratorCatalog();
    invalidateImageCatalogCache();
    revalidatePath("/[locale]/pricing", "page");
    revalidatePath("/[locale]/models", "page");
    await auditAdmin(request, admin.id, "pricing.multiplier.updated", "pricing_batch", batchId, { ...changed, synced });
    return Response.json({ ok: true, batchId, ...changed, synced });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("pricing_multiplier_update_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось применить множители", 500);
  }
}
