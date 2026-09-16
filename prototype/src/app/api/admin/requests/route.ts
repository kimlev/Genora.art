import { requireAdmin } from "@/lib/server/admin-session";
import { query } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

type RequestRow = {
  id: string;
  createdAt: string;
  answeredAt: string | null;
  email: string;
  type: string;
  model: string | null;
  agent: string | null;
  provider: string | null;
  costUsd: number;
  status: "success" | "running" | "error";
};

function asStatus(status: string, ackedAt: Date | null): RequestRow["status"] {
  if (status === "failed") return "error";
  if (status === "ready") return ackedAt ? "success" : "running";
  return "running";
}

function lastThreeDaysFrom() {
  return new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || lastThreeDaysFrom();
    const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const userId = url.searchParams.get("userId") || "";
    const type = url.searchParams.get("type") || "";
    const model = url.searchParams.get("model") || "";
    const status = url.searchParams.get("status") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return jsonError("Некорректный период");
    if (status && !["success", "running", "error"].includes(status)) return jsonError("Некорректный статус");
    const rows = await query<{
      id: string;
      kind: string;
      status: string;
      model_label: string | null;
      provider: string | null;
      agent: string | null;
      created_at: Date;
      updated_at: Date;
      acked_at: Date | null;
      email: string;
      cost_usd: string | null;
    }>(
      `SELECT * FROM (
         SELECT j.id::text AS id,
                j.kind,
                j.status,
                j.model_label,
                NULLIF(j.payload->>'providerId','') AS provider,
                NULLIF(COALESCE(j.payload->>'agentName', j.payload->>'agentId'),'') AS agent,
                j.created_at,
                j.updated_at,
                j.acked_at,
                u.email,
                ue.cost_usd::text
           FROM generation_jobs j
           JOIN users u ON u.id = j.user_id
           LEFT JOIN LATERAL (
             SELECT cost_usd FROM usage_entries
              WHERE upstream_request_id = j.id::text OR id = 'chat-' || j.id OR id = 'image-' || j.id OR id = 'music-' || j.id
              ORDER BY created_at DESC LIMIT 1
           ) ue ON true
          WHERE j.created_at >= $1::date AND j.created_at < ($2::date + interval '1 day')
            AND ($3 = '' OR j.user_id::text = $3)
            AND ($4 = '' OR j.kind = $4)
            AND ($5 = '' OR COALESCE(j.model_label,'') = $5)
         UNION ALL
         SELECT v.id::text,
                'video',
                v.status,
                v.model_label,
                v.provider,
                NULL,
                v.created_at,
                v.updated_at,
                CASE WHEN v.status = 'ready' THEN v.updated_at ELSE NULL END,
                u.email,
                ue.cost_usd::text
           FROM video_jobs v
           JOIN users u ON u.id = v.user_id
           LEFT JOIN LATERAL (
             SELECT cost_usd FROM usage_entries
              WHERE upstream_request_id = COALESCE(v.integrator_request_id, v.id::text)
                 OR id = 'video-' || COALESCE(v.integrator_request_id, v.id::text)
              ORDER BY created_at DESC LIMIT 1
           ) ue ON true
          WHERE v.created_at >= $1::date AND v.created_at < ($2::date + interval '1 day')
            AND ($3 = '' OR v.user_id::text = $3)
            AND ($4 = '' OR $4 = 'video')
            AND ($5 = '' OR COALESCE(v.model_label,'') = $5)
       ) items
       WHERE ($6 = '' OR (
         CASE
           WHEN status = 'failed' THEN 'error'
           WHEN status = 'ready' AND acked_at IS NOT NULL THEN 'success'
           ELSE 'running'
         END
       ) = $6)
       ORDER BY created_at DESC
       LIMIT 2000`,
      [from, to, userId, type, model, status],
    );
    const items: RequestRow[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at.toISOString(),
      answeredAt: row.updated_at.toISOString(),
      email: row.email,
      type: row.kind,
      model: row.model_label,
      agent: row.agent,
      provider: row.provider,
      costUsd: Number(row.cost_usd ?? 0),
      status: asStatus(row.status, row.acked_at),
    }));
    const modelRows = await query<{ model_label: string; provider: string | null }>(
      `SELECT model_label, MIN(provider) AS provider FROM (
         SELECT j.model_label, NULLIF(j.payload->>'providerId','') AS provider
           FROM generation_jobs j
          WHERE j.created_at >= $1::date AND j.created_at < ($2::date + interval '1 day')
            AND j.model_label IS NOT NULL
         UNION ALL
         SELECT v.model_label, v.provider
           FROM video_jobs v
          WHERE v.created_at >= $1::date AND v.created_at < ($2::date + interval '1 day')
            AND v.model_label IS NOT NULL
       ) models
       GROUP BY model_label
       ORDER BY model_label`,
      [from, to],
    );
    const users = await query<{ id: string; email: string }>("SELECT id, email FROM users ORDER BY email LIMIT 400");
    return Response.json({
      items,
      users,
      models: modelRows.map((row) => ({ label: row.model_label, provider: row.provider })),
      running: items.some((item) => item.status === "running"),
    });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("admin_requests_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось загрузить запросы", 500);
  }
}
