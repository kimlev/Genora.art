import { isSameOrigin, jsonError } from "@/lib/server/http";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { query, withTransaction } from "@/lib/server/db";
import { sendSupportReply } from "@/lib/server/mail";
import { generateSupportAgentReply } from "@/lib/server/support-agent";
import { listSupportMailboxes } from "@/lib/server/support-mailboxes";
import { translateSupportRequest } from "@/lib/server/support-translate";

export const runtime = "nodejs";
export const maxDuration = 120;

type SupportRow = { id: string; public_id: string; name: string; email: string; topic: string; message: string; status: string; draft_reply: string | null; created_at: Date; replied_at: Date | null; translation_ru: string | null; translated_at: Date | null; inbox_email: string | null; admin_read_at: Date | null };
type MessageRow = { id: string; support_request_id: string; direction: "inbound" | "outbound"; author_type: "client" | "agent" | "administrator"; content: string; created_at: Date };

function status(value: string): "new" | "in_progress" | "requires_human" {
  if (value === "requires_human") return "requires_human";
  return value === "in_progress" || value === "replied" ? "in_progress" : "new";
}

function publicMessage(row: MessageRow) {
  return { id: row.id, direction: row.direction, authorType: row.author_type, content: row.content, createdAt: row.created_at.toISOString() };
}

function publicRequest(row: SupportRow, messages: MessageRow[] = []) {
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    email: row.email,
    inboxEmail: row.inbox_email,
    topic: row.topic,
    status: status(row.status),
    draftReply: row.draft_reply,
    createdAt: row.created_at.toISOString(),
    repliedAt: row.replied_at?.toISOString() ?? null,
    translationRu: row.translation_ru,
    translatedAt: row.translated_at?.toISOString() ?? null,
    readAt: row.admin_read_at?.toISOString() ?? null,
    messages: messages.map(publicMessage),
  };
}

async function requestList(inboxEmail?: string) {
  const rows = inboxEmail
    ? await query<SupportRow>(`SELECT id,public_id,name,email,topic,message,status,draft_reply,created_at,replied_at,translation_ru,translated_at,inbox_email,admin_read_at
      FROM support_requests WHERE lower(inbox_email)=lower($1) ORDER BY created_at DESC LIMIT 300`, [inboxEmail])
    : await query<SupportRow>(`SELECT id,public_id,name,email,topic,message,status,draft_reply,created_at,replied_at,translation_ru,translated_at,inbox_email,admin_read_at
      FROM support_requests ORDER BY created_at DESC LIMIT 300`);
  return rows.map((row) => publicRequest(row));
}

async function requestDetail(id: string) {
  const rows = await query<SupportRow>(`SELECT id,public_id,name,email,topic,message,status,draft_reply,created_at,replied_at,translation_ru,translated_at,inbox_email,admin_read_at
    FROM support_requests WHERE id=$1`, [id]);
  const row = rows[0];
  if (!row) return null;
  const messages = await query<MessageRow>(`SELECT id,support_request_id,direction,author_type,content,created_at
    FROM support_request_messages WHERE support_request_id=$1 ORDER BY created_at,id`, [id]);
  return publicRequest(row, messages);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim() ?? "";
    const inbox = params.get("inbox")?.trim() ?? "";
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Обращение не найдено", 404);
      const item = await requestDetail(id);
      if (!item) return jsonError("Обращение не найдено", 404);
      return Response.json({ request: item });
    }
    await listSupportMailboxes();
    return Response.json({ requests: await requestList(inbox) });
  } catch (error) {
    const unauthorized = (error as Error).message === "ADMIN_UNAUTHORIZED";
    return jsonError(unauthorized ? "Требуется вход" : "Не удалось загрузить обращения", unauthorized ? 401 : 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { action?: unknown; id?: unknown; reply?: unknown; force?: unknown } | null;
    const action = String(body?.action ?? "");
    const id = String(body?.id ?? "");
    if (!id) return jsonError("Обращение не выбрано");

    if (action === "read") {
      const marked = await query<{ id: string }>(`UPDATE support_requests
        SET admin_read_at=COALESCE(admin_read_at,now())
        WHERE id=$1 RETURNING id`, [id]);
      if (!marked[0]) return jsonError("Обращение не найдено", 404);
      return Response.json({ ok: true, request: await requestDetail(id) });
    }

    const rows = await query<SupportRow>(`SELECT id,public_id,name,email,topic,message,status,draft_reply,created_at,replied_at,translation_ru,translated_at,inbox_email,admin_read_at
      FROM support_requests WHERE id=$1`, [id]);
    const support = rows[0];
    if (!support) return jsonError("Обращение не найдено", 404);
    const history = await query<MessageRow>(`SELECT id,support_request_id,direction,author_type,content,created_at
      FROM support_request_messages WHERE support_request_id=$1 ORDER BY created_at,id`, [id]);

    if (action === "draft") {
      if (support.status === "requires_human") return jsonError("Обращение передано сотруднику: дальнейшие AI-ответы отключены", 409);
      const generated = await generateSupportAgentReply({ support, history, admin });
      await query("UPDATE support_requests SET draft_reply=$2 WHERE id=$1", [id, generated.reply]);
      await auditAdmin(request, admin.id, "support_draft", "support_request", id, { model: generated.modelId });
      return Response.json({ ok: true, draft: generated.reply });
    }

    if (action === "translate") {
      try {
        const translated = await translateSupportRequest({ id, admin, force: Boolean(body?.force) });
        await auditAdmin(request, admin.id, "support_translate", "support_request", id, { alreadyTranslated: translated.alreadyTranslated });
        return Response.json({ ok: true, translationRu: translated.translationRu });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "SUPPORT_NOT_FOUND") return jsonError("Обращение не найдено", 404);
        if (code === "SUPPORT_EMPTY_SOURCE") return jsonError("В письме нет текста для перевода");
        if (code === "SUPPORT_EMPTY_TRANSLATION") return jsonError("Модель вернула пустой перевод");
        if (code === "SUPPORT_NOT_RUSSIAN") return jsonError("Модель не перевела на русский. Нажмите «Перевод» ещё раз.");
        if (code === "SUPPORT_MODEL_NOT_AVAILABLE") return jsonError("Нет доступной модели для перевода");
        if (/validation_error/i.test(code)) return jsonError("Модель не приняла запрос на перевод. Попробуйте ещё раз.");
        throw error;
      }
    }

    if (action === "send") {
      const reply = String(body?.reply ?? support.draft_reply ?? "").trim().slice(0, 12_000);
      if (!reply) return jsonError("Текст ответа пуст");
      await sendSupportReply(support.email, `[${support.public_id}] Ответ службы поддержки Genora.art`, reply);
      await withTransaction(async (client) => {
        await client.query(`INSERT INTO support_request_messages(support_request_id,direction,author_type,content)
          VALUES($1,'outbound','administrator',$2)`, [id, reply]);
        await client.query("UPDATE support_requests SET sent_reply=$2,draft_reply=NULL,status='in_progress',requires_human=false,replied_at=now(),replied_by=$3 WHERE id=$1", [id, reply, admin.id]);
      });
      await auditAdmin(request, admin.id, "support_send", "support_request", id, { recipient: support.email });
      return Response.json({ ok: true });
    }
    return jsonError("Неизвестное действие");
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход", 401);
    console.error("admin_support_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Операция поддержки не выполнена", 500);
  }
}
