import { createHash, randomBytes } from "node:crypto";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { query } from "@/lib/server/db";
import { isSameOrigin, isValidEmail, jsonError, normalizeEmail } from "@/lib/server/http";
import { sendAdminInvitation } from "@/lib/server/mail";
import { publicAdminOrigin } from "@/lib/server/public-origins";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) return jsonError("Укажите корректный email");
    if ((await query("SELECT 1 FROM administrators WHERE email=$1 AND active=true", [email])).length) return jsonError("Администратор уже существует", 409);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await query("DELETE FROM admin_invitations WHERE email=$1 AND accepted_at IS NULL", [email]);
    const rows = await query<{ id: string }>(`INSERT INTO admin_invitations(email,token_hash,invited_by,expires_at)
      VALUES($1,$2,$3,now()+interval '24 hours') RETURNING id`, [email, tokenHash, admin.id]);
    const origin = publicAdminOrigin();
    try {
      await sendAdminInvitation(email, `${origin}/admin/accept-invite?token=${encodeURIComponent(token)}`);
    } catch (error) {
      await query("DELETE FROM admin_invitations WHERE id=$1", [rows[0].id]);
      if ((error as Error).message === "SMTP_NOT_CONFIGURED") return jsonError("Корпоративная почта ещё не подключена к SMTP", 503);
      console.error("admin_invitation_mail_failed", error);
      return jsonError("Не удалось отправить приглашение", 502);
    }
    await auditAdmin(request, admin.id, "invite", "administrator", rows[0].id, { email });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("admin_invitation_failed", error);
    return jsonError("Не удалось создать приглашение", 500);
  }
}
