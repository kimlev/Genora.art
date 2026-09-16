import { compare, hash } from "bcryptjs";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request)) return jsonError("Недопустимый источник запроса",403);
  try{
    const actor=await requireAdmin(); const {id}=await params; const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body) return jsonError("Некорректные данные"); const action=String(body.action??"");
    const actorRows=await query<{password_hash:string}>("SELECT password_hash FROM administrators WHERE id=$1",[actor.id]);
    const currentPassword=String(body.currentPassword??"");
    if(!actorRows[0]||!(await compare(currentPassword,actorRows[0].password_hash))) return jsonError("Неверный текущий пароль",403);
    if(action==="profile"){
      const name=String(body.name??"").trim().slice(0,100)||null;const nickname=String(body.nickname??"").trim().slice(0,50)||null;const timezone=String(body.timezone??"").trim().slice(0,80)||null;
      await query("UPDATE administrators SET name=$2,nickname=$3,timezone=$4,updated_at=now() WHERE id=$1",[id,name,nickname,timezone]);
    }else if(action==="security"){
      const addresses=Array.isArray(body.ipAllowlist)?body.ipAllowlist.map((value)=>String(value).trim()).filter(Boolean).slice(0,50):[];
      const pin=String(body.pin??""); const clearPin=body.clearPin===true;
      if(pin&&!/^\d{4}$/.test(pin)) return jsonError("PIN должен содержать 4 цифры");
      const pinHash=pin?await hash(pin,12):null;
      await query(`UPDATE administrators SET ip_allowlist=$2::cidr[],pin_hash=CASE WHEN $3::boolean THEN NULL WHEN $4::text IS NOT NULL THEN $4 ELSE pin_hash END,updated_at=now() WHERE id=$1`,[id,addresses,clearPin,pinHash]);
    }else if(action==="password"){
      const newPassword=String(body.newPassword??"");if(newPassword.length<8||newPassword.length>128) return jsonError("Новый пароль должен содержать от 8 до 128 символов");
      await query("UPDATE administrators SET password_hash=$2,password_set_at=now(),updated_at=now() WHERE id=$1",[id,await hash(newPassword,12)]);
      await query("DELETE FROM admin_sessions WHERE administrator_id=$1 AND administrator_id<>$2",[id,actor.id]);
    }else return jsonError("Неизвестное действие");
    await auditAdmin(request,actor.id,`administrator.${action}`,"administrator",id);
    return Response.json({ok:true});
  }catch(error){if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);if((error as {code?:string}).code==="22P02") return jsonError("Белый список содержит некорректный IP или CIDR");console.error("admin_update_failed",error);return jsonError("Не удалось обновить администратора",500);}
}
