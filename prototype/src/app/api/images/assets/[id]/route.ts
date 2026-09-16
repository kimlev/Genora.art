import { query } from "@/lib/server/db";
import { serveMediaAsset } from "@/lib/server/media-assets";
import { requireUser } from "@/lib/server/session";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser();
    const {id}=await params;
    if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))return new Response(null,{status:404});
    const rows=await query<{exists:boolean}>(`SELECT EXISTS(
      SELECT 1 FROM image_generations WHERE user_id=$1 AND $2=ANY(asset_ids)
      UNION ALL
      SELECT 1 FROM characters WHERE user_id=$1 AND ($2=ANY(source_asset_ids) OR $2=ANY(sheet_asset_ids))
    ) exists`,[user.id,id]);
    if(!rows[0]?.exists)return new Response(null,{status:404});
    const variant=new URL(request.url).searchParams.get("variant")==="preview"?"preview":"original";
    const asset=await serveMediaAsset("image",id,variant);
    return new Response(new Uint8Array(asset.bytes),{headers:{"content-type":asset.mime,"content-length":String(asset.bytes.byteLength),"cache-control":"private, max-age=31536000, immutable","x-content-type-options":"nosniff"}});
  }catch(error){
    if((error as Error).message==="UNAUTHORIZED")return new Response(null,{status:401});
    return new Response(null,{status:(error as Error&{statusCode?:number}).statusCode===404?404:502});
  }
}
