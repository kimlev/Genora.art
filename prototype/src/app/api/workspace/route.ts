import { applyAlignedUsageToMessages } from "@/lib/chat-usage-tokens";
import { query, withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { loadUserChatUsage, syncMessageUsageTokens } from "@/lib/server/sync-message-usage";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

function uniqueAssistantCopies<T extends { role?: string; content?: unknown; conversation_id?: string }>(
  messages: T[],
  conversationId?: string,
): T[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (String(message.role) !== "assistant") return true;
    const key = `${conversationId || message.conversation_id || ""}\n${String(message.content ?? "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type ConversationRow = {
  id: string; title: string; model_id: string | null; provider_id: string | null;
  depth_id: string | null; agent_id: string | null; updated_at: Date;
};
type MessageRow = {
  id: string; conversation_id: string; role: "user" | "assistant" | "system"; content: string;
  model_id: string | null; token_count: number | null; thinking_ms: number | null; image: string | null;
  link_href: string | null; link_label: string | null; created_at: Date;
  attachments: Array<{ name: string; mime: string; kind: "image" | "file" | "audio" | "video"; size: number }> | null;
};

export async function GET() {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const conversations = await query<ConversationRow>(`SELECT id, title, model_id, provider_id, depth_id, agent_id, updated_at
      FROM conversations WHERE user_id = $1 AND hidden_at IS NULL ORDER BY updated_at DESC`, [user.id]);
    const messages = uniqueAssistantCopies(await query<MessageRow>(`SELECT m.id, m.conversation_id, m.role, m.content, m.model_id, m.token_count,
      m.thinking_ms, m.image, m.link_href, m.link_label, m.attachments, m.created_at
      FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = $1 AND c.hidden_at IS NULL ORDER BY m.created_at`, [user.id]));
    const usage = await loadUserChatUsage(user.id);
    const tokenById = new Map(applyAlignedUsageToMessages(
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        conversationId: message.conversation_id,
        createdAt: message.created_at,
        tokenCount: message.token_count,
      })),
      usage,
    ).map((message) => [message.id, message.tokenCount]));
    return Response.json({ conversations: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at.toISOString(),
      modelId: conversation.model_id,
      providerId: conversation.provider_id,
      depthId: conversation.depth_id,
      agentId: conversation.agent_id,
      messages: messages.filter((message) => message.conversation_id === conversation.id).map((message) => ({
        id: message.id, role: message.role, content: message.content,
        modelId: message.model_id ?? undefined, tokenCount: tokenById.get(message.id) ?? message.token_count ?? undefined,
        thinkingMs: message.thinking_ms ?? undefined, image: message.image ?? undefined,
        attachments: message.attachments ?? undefined,
        link: message.link_href && message.link_label ? { href: message.link_href, label: message.link_label } : undefined,
        timestamp: message.created_at.toISOString(),
      })),
    })) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("workspace_load_failed", error);
    return jsonError(copy.chatsLoadFailed, 500);
  }
}

export async function PUT(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { conversations?: unknown; locale?: unknown } | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = apiAppCopy(locale);
    if (!Array.isArray(body?.conversations) || body.conversations.length > 500) return jsonError(copy.invalidChatList);
    const conversations = body.conversations as Array<Record<string, unknown>>;
    await withTransaction(async (client) => {
      const ids = conversations.map((item) => String(item.id ?? "")).filter((id) => id && id.length <= 120);
      if (ids.length) {
        await client.query(
          `UPDATE conversations c SET hidden_at=COALESCE(c.hidden_at,now())
            WHERE c.user_id = $1 AND c.hidden_at IS NULL AND NOT (c.id = ANY($2::text[]))`,
          [user.id, ids],
        );
      } else {
        await client.query(
          `UPDATE conversations c SET hidden_at=COALESCE(c.hidden_at,now())
            WHERE c.user_id = $1 AND c.hidden_at IS NULL`,
          [user.id],
        );
      }

      for (const item of conversations) {
        const id = String(item.id ?? "").slice(0, 120);
        const title = String(item.title ?? copy.newChat).trim().slice(0, 200) || copy.newChat;
        if (!id) continue;
        const updatedAt = new Date(String(item.updatedAt ?? new Date().toISOString()));
        const owned = await client.query(`INSERT INTO conversations(id, user_id, title, model_id, provider_id, depth_id, agent_id, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, model_id=EXCLUDED.model_id,
          provider_id=EXCLUDED.provider_id, depth_id=EXCLUDED.depth_id, agent_id=EXCLUDED.agent_id,
          updated_at=EXCLUDED.updated_at WHERE conversations.user_id=$2 RETURNING id`,
          [id, user.id, title, item.modelId || null, item.providerId || null, item.depthId || null, item.agentId || null,
            Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt]);
        if (!owned.rowCount) continue;
        await client.query(`DELETE FROM messages m USING conversations c
          WHERE m.conversation_id=c.id AND c.id=$1 AND c.user_id=$2
            AND NOT EXISTS (
              SELECT 1 FROM generation_jobs g
              WHERE g.user_id=$2 AND g.conversation_id=$1 AND g.kind='chat'
                AND (
                  g.status='creating'
                  OR g.result->>'messageId' = m.id
                  OR g.payload->>'userMessageId' = m.id
                )
            )`, [id,user.id]);
        const messages = uniqueAssistantCopies(
          Array.isArray(item.messages) ? item.messages.slice(0, 2_000) as Array<Record<string, unknown>> : [],
          id,
        );
        for (const message of messages) {
          const messageId = String(message.id ?? "").slice(0, 160);
          const role = ["user", "assistant", "system"].includes(String(message.role)) ? String(message.role) : "user";
          if (!messageId) continue;
          const timestamp = new Date(String(message.timestamp ?? new Date().toISOString()));
          const link = message.link && typeof message.link === "object" ? message.link as Record<string, unknown> : null;
          const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, 8) : [];
          await client.query(`INSERT INTO messages(id, conversation_id, role, content, model_id, token_count,
            thinking_ms, image, link_href, link_label, attachments, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT (id) DO NOTHING`,
            [messageId, id, role, String(message.content ?? ""), message.modelId || null,
              Number.isFinite(message.tokenCount) ? message.tokenCount : null,
              Number.isFinite(message.thinkingMs) ? message.thinkingMs : null,
              typeof message.image === "string" ? message.image : null,
              typeof link?.href === "string" ? link.href : null, typeof link?.label === "string" ? link.label : null,
              JSON.stringify(attachments.map((attachment) => {
                const value = attachment && typeof attachment === "object" ? attachment as Record<string, unknown> : {};
                return { name: String(value.name ?? "").slice(0, 255), mime: String(value.mime ?? "").slice(0, 160), kind: value.kind, size: Number(value.size ?? 0) };
              })), Number.isNaN(timestamp.getTime()) ? new Date() : timestamp]);
        }
      }
      await syncMessageUsageTokens(client, user.id);
    });
    return Response.json({ ok: true });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("workspace_save_failed", error);
    return jsonError(copy.chatsSaveFailed, 500);
  }
}

export async function DELETE(request: Request) {
  const locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("conversationId")?.slice(0, 120) ?? "";
    if (!id) return jsonError(apiAppCopy(locale).conversationInvalid, 400);
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE conversations SET hidden_at=COALESCE(hidden_at,now()) WHERE id=$1 AND user_id=$2",
        [id, user.id],
      );
      await client.query(
        "UPDATE usage_entries SET deleted=true WHERE user_id=$1 AND conversation_id=$2",
        [user.id, id],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("workspace_hide_failed", error);
    return jsonError(copy.conversationDeleteFailed, 500);
  }
}
