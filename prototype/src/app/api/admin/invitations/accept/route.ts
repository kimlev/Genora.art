import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { createAdminSession } from "@/lib/server/admin-session";
import { withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  const body = await request.json().catch(() => null) as { token?: unknown; password?: unknown; name?: unknown } | null;
  const token = String(body?.token ?? ""); const password = String(body?.password ?? ""); const name = String(body?.name ?? "").trim().slice(0, 100) || null;
  if (token.length < 32 || password.length < 8 || password.length > 128) return jsonError("Пароль должен содержать от 8 до 128 символов");
  try {
    const passwordHash = await hash(password, 12); const tokenHash = createHash("sha256").update(token).digest("hex");
    const adminId = await withTransaction(async (client) => {
      const invitation = await client.query<{ id: string; email: string }>(`SELECT id,email FROM admin_invitations
        WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE`, [tokenHash]);
      if (!invitation.rows[0]) throw new Error("INVALID_INVITATION");
      const result = await client.query<{ id: string }>(`INSERT INTO administrators(email,password_hash,name,active,password_set_at)
        VALUES($1,$2,$3,true,now()) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=COALESCE(EXCLUDED.name,administrators.name),active=true,password_set_at=now(),updated_at=now() RETURNING id`,
        [invitation.rows[0].email,passwordHash,name]);
      await client.query("UPDATE admin_invitations SET accepted_at=now() WHERE id=$1",[invitation.rows[0].id]);
      return result.rows[0].id;
    });
    await createAdminSession(adminId, request);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "INVALID_INVITATION") return jsonError("Ссылка недействительна или истекла", 410);
    console.error("admin_invitation_accept_failed",error);
    return jsonError("Не удалось принять приглашение",500);
  }
}
