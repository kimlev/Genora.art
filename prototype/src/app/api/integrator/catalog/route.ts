import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { syncIntegratorCatalog } from "@/lib/server/catalog-sync";
import { query } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime="nodejs";

function validSignature(request:Request,body:string):boolean{
  const secret=process.env.INTEGRATOR_CATALOG_WEBHOOK_SECRET?.trim();
  const timestamp=request.headers.get("x-integratorai-timestamp")??"";
  const supplied=request.headers.get("x-integratorai-signature")?.replace(/^sha256=/,"")??"";
  if(!secret||!/^[a-f0-9]{64}$/i.test(supplied)||!/^\d{10,13}$/.test(timestamp))return false;
  const seconds=Number(timestamp.length===13?Number(timestamp)/1000:timestamp);
  if(!Number.isFinite(seconds)||Math.abs(Date.now()/1000-seconds)>300)return false;
  const expected=createHmac("sha256",secret).update(`${timestamp}.${body}`).digest("hex");
  return timingSafeEqual(Buffer.from(supplied,"hex"),Buffer.from(expected,"hex"));
}

export async function POST(request:Request){
  const copy=apiAppCopy(await requestLocale());
  const rawBody=await request.text();
  if(!validSignature(request,rawBody))return jsonError(copy.invalidSignature,401);
  let payload:{id?:unknown;type?:unknown};
  try{payload=JSON.parse(rawBody) as {id?:unknown;type?:unknown}}catch{return jsonError(copy.invalidJson)}
  const eventId=String(payload.id??request.headers.get("x-integratorai-delivery")??"").slice(0,200);
  const eventType=String(payload.type??request.headers.get("x-integratorai-event")??"catalog.updated").slice(0,80);
  if(!eventId)return jsonError(copy.eventIdMissing);
  const accepted=await query<{event_id:string;applied_at:Date|null}>(`INSERT INTO catalog_sync_events(event_id,event_type,payload_hash)
    VALUES($1,$2,$3) ON CONFLICT(event_id) DO UPDATE SET event_type=EXCLUDED.event_type
    RETURNING event_id,applied_at`,[eventId,eventType,createHash("sha256").update(rawBody).digest("hex")]);
  if(accepted[0]?.applied_at)return Response.json({ok:true,status:"duplicate"});
  try{
    const synced=await syncIntegratorCatalog();
    await query("UPDATE catalog_sync_events SET provider_count=$2,model_count=$3,applied_at=now() WHERE event_id=$1",[eventId,synced.providers,synced.models]);
    return Response.json({ok:true,status:"applied",...synced});
  }catch(error){
    console.error("catalog_webhook_sync_failed",error instanceof Error?error.message:"unknown");
    return jsonError(copy.catalogUpdateFailed,502);
  }
}
