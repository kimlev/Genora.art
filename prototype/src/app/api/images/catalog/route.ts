import { billedTokensFromUsd } from "@/lib/billing";
import { query, withTransaction } from "@/lib/server/db";
import { imageCatalogCacheVersion } from "@/lib/server/image-catalog-cache";
import { integratorImageCatalog } from "@/lib/server/integrator";

export const runtime = "nodejs";

type CatalogPayload = Awaited<ReturnType<typeof buildCatalog>>;
let cachedCatalog: { version: number; expiresAt: number; value: CatalogPayload } | null = null;
let pendingCatalog: Promise<CatalogPayload> | null = null;

async function buildCatalog() {
  const catalog = await integratorImageCatalog();
  await withTransaction(async (client) => {
    for (const [index, provider] of catalog.providers.entries()) {
      await client.query(`INSERT INTO ai_providers(id,display_name,active,sort_order,synced_at)
        VALUES($1,$2,true,$3,now()) ON CONFLICT(id) DO UPDATE SET
        display_name=EXCLUDED.display_name,active=true,synced_at=now(),updated_at=now()`,
      [provider.id, provider.label, (index + 1) * 10]);
    }
  });
  const [multipliers, modelMarkups] = await Promise.all([
    query<{id:string;billing_multiplier:string}>("SELECT id,billing_multiplier FROM ai_providers WHERE active=true"),
    query<{id:string;markup_multiplier:string}>("SELECT id,markup_multiplier FROM ai_models WHERE active=true"),
  ]);
  const multiplierByProvider=new Map(multipliers.map((row)=>[row.id,Number(row.billing_multiplier)]));
  const multiplierByModel=new Map(modelMarkups.map((row)=>[row.id,Number(row.markup_multiplier)]));
  const models=catalog.models.map(({price_per_image_usd,...model})=>{
    const multiplier=multiplierByModel.get(model.id)??multiplierByProvider.get(model.provider)??1;
    const token_prices=Object.fromEntries(Object.entries(price_per_image_usd).map(([variant,price])=>[variant,billedTokensFromUsd(Number(price),multiplier)]));
    const average=Number(model.average_request_cost_usd);
    return {
      ...model,
      token_prices,
      billed_average_tokens:Number.isFinite(average)&&average>0
        ? billedTokensFromUsd(average,multiplier)
        : 0,
    };
  });
  return { ...catalog, models, available: models.length > 0 };
}

async function catalogPayload() {
  const version = imageCatalogCacheVersion();
  if (cachedCatalog && cachedCatalog.version === version && cachedCatalog.expiresAt > Date.now()) return cachedCatalog.value;
  if (!pendingCatalog) pendingCatalog = buildCatalog().then((value) => {
    cachedCatalog = { version, value, expiresAt: Date.now() + 5_000 };
    return value;
  }).finally(() => { pendingCatalog = null; });
  return pendingCatalog;
}

export async function GET() {
  try {
    return Response.json(await catalogPayload(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("image_catalog_failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ providers: [], styles: [], models: [], available: false }, { status: 503 });
  }
}
