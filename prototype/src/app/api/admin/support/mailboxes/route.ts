import { isSameOrigin, jsonError } from "@/lib/server/http";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { deleteSupportMailbox, getMailboxRow, listSupportMailboxes, saveSupportMailbox } from "@/lib/server/support-mailboxes";
import { syncSupportMailbox } from "@/lib/server/support-inbox";
import { SUPPORT_MAIL_PROVIDERS } from "@/lib/support-mail-providers";

export const runtime = "nodejs";
export const maxDuration = 120;

function mailboxError(code: string) {
  if (code === "MAIL_EMAIL_INVALID") return jsonError("Укажите корректный адрес почты");
  if (code === "MAIL_PROVIDER_UNKNOWN") return jsonError("Выберите провайдера из списка");
  if (code === "MAIL_PASSWORD_REQUIRED") return jsonError("Укажите пароль приложения");
  if (code === "MAIL_PASSWORD_INVALID") return jsonError("Пароль приложения не подходит. Почта не сохранена.");
  if (code === "MAIL_CONNECT_FAILED") return jsonError("Не удалось подключиться к почте. Проверьте адрес и провайдера.");
  if (code === "MAIL_ALREADY_EXISTS") return jsonError("Эта почта уже подключена");
  if (code === "MAIL_NOT_FOUND") return jsonError("Почта не найдена", 404);
  return null;
}

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ mailboxes: await listSupportMailboxes(), providers: SUPPORT_MAIL_PROVIDERS });
  } catch (error) {
    const unauthorized = (error as Error).message === "ADMIN_UNAUTHORIZED";
    return jsonError(unauthorized ? "Требуется вход" : "Не удалось загрузить почты", unauthorized ? 401 : 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as {
      action?: unknown;
      id?: unknown;
      email?: unknown;
      provider?: unknown;
      appPassword?: unknown;
      isPrimary?: unknown;
      isAuth?: unknown;
      full?: unknown;
    } | null;
    const action = String(body?.action ?? "save");
    const id = String(body?.id ?? "").trim();

    if (action === "delete") {
      if (!id) return jsonError("Почта не выбрана");
      const mailbox = await getMailboxRow(id);
      await deleteSupportMailbox(id);
      await auditAdmin(request, admin.id, "support_mailbox_delete", "support_mailbox", id, { email: mailbox?.email });
      return Response.json({ ok: true, mailboxes: await listSupportMailboxes() });
    }

    if (action === "sync") {
      if (!id) return jsonError("Почта не выбрана");
      const result = await syncSupportMailbox(id, { full: Boolean(body?.full) });
      await auditAdmin(request, admin.id, "support_mailbox_sync", "support_mailbox", id, { full: Boolean(body?.full) });
      return Response.json({ ok: true, result, mailboxes: await listSupportMailboxes() });
    }

    const mailbox = await saveSupportMailbox({
      id: id || undefined,
      email: String(body?.email ?? ""),
      provider: String(body?.provider ?? "privateemail"),
      appPassword: String(body?.appPassword ?? ""),
      isPrimary: Boolean(body?.isPrimary),
      isAuth: Boolean(body?.isAuth),
    });
    await auditAdmin(request, admin.id, id ? "support_mailbox_update" : "support_mailbox_create", "support_mailbox", mailbox.id, { email: mailbox.email });
    return Response.json({ ok: true, mailbox, mailboxes: await listSupportMailboxes() });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход", 401);
    const mapped = mailboxError((error as Error).message);
    if (mapped) return mapped;
    console.error("admin_support_mailbox_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось сохранить почту", 500);
  }
}
