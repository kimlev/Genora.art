import { query } from "@/lib/server/db";

export const runtime="nodejs";

export async function GET(){
  try{await query("SELECT 1");return Response.json({ok:true,service:"genora"})}
  catch{return Response.json({ok:false},{status:503})}
}
