import { compare } from "bcryptjs";
import { auditAdmin, createAdminSession } from "@/lib/server/admin-session";
import { query } from "@/lib/server/db";
import { isSameOrigin, isValidEmail, jsonError, normalizeEmail } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/request-meta";

export const runtime = "nodejs";

type AdminRow = { id:string;email:string;name:string|null;password_hash:string;pin_hash:string|null;active:boolean;ip_allowed:boolean };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  const body = await request.json().catch(() => null) as {email?:unknown;password?:unknown;pin?:unknown;remember?:unknown}|null;
  const email = normalizeEmail(body?.email);
  const password = String(body?.password ?? "");
  if (!isValidEmail(email) || !password) return jsonError("Неверный email или пароль", 401);
  const meta=requestMeta(request);
  const attempts=await query<{count:string}>(`SELECT count(*)::text count FROM admin_login_attempts
    WHERE success=false AND attempted_at>now()-interval '15 minutes' AND (email=$1 OR ip_address=$2::inet)`,[email,meta.ipAddress]);
  if(Number(attempts[0]?.count??0)>=8) return jsonError("Слишком много попыток. Повторите позже",429);
  const rows = await query<AdminRow>(`SELECT id,email,name,password_hash,pin_hash,active,
    CASE WHEN cardinality(ip_allowlist)=0 THEN true WHEN $2::inet IS NULL THEN false ELSE $2::inet <<= ANY(ip_allowlist) END ip_allowed
    FROM administrators WHERE email=$1`, [email,meta.ipAddress]);
  const admin = rows[0];
  if (!admin?.active || !(await compare(password, admin.password_hash))) {
    await query("INSERT INTO admin_login_attempts(email,ip_address,success) VALUES($1,$2,false)",[email,meta.ipAddress]);
    return jsonError("Неверный email или пароль", 401);
  }
  if (!admin.ip_allowed) {
    await query("INSERT INTO admin_login_attempts(email,ip_address,success) VALUES($1,$2,false)",[email,meta.ipAddress]);
    return jsonError("Вход с этого IP-адреса запрещён",403);
  }
  if (admin.pin_hash && !(await compare(String(body?.pin??""), admin.pin_hash))) {
    if (!body?.pin) return Response.json({error:"Введите PIN-код",code:"PIN_REQUIRED"},{status:428});
    await query("INSERT INTO admin_login_attempts(email,ip_address,success) VALUES($1,$2,false)",[email,meta.ipAddress]);
    return Response.json({error:"Неверный PIN-код",code:"PIN_REQUIRED"},{status:401});
  }
  await query("INSERT INTO admin_login_attempts(email,ip_address,success) VALUES($1,$2,true)",[email,meta.ipAddress]);
  await createAdminSession(admin.id, request, body?.remember === true);
  await query("UPDATE administrators SET updated_at=now() WHERE id=$1",[admin.id]);
  await auditAdmin(request, admin.id, "login", "administrator", admin.id);
  return Response.json({admin:{id:admin.id,email:admin.email,name:admin.name}});
}
