import { isAgentCategory } from "@/lib/agent-context";
import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

type AgentRow = { id: string; name: string; description: string; system_prompt: string; icon: string; model_id: string; context: string };

function mapAgent(row: AgentRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    icon: row.icon,
    modelId: row.model_id,
    category: "custom" as const,
    context: isAgentCategory(row.context) ? row.context : "writing",
  };
}

export async function GET() {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const rows = await query<AgentRow>("SELECT id, name, description, system_prompt, icon, model_id, context FROM custom_agents WHERE user_id=$1 ORDER BY updated_at DESC", [user.id]);
    return Response.json({ agents: rows.map(mapAgent) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.agentsLoadFailed, 500);
  }
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = apiAppCopy(locale);
    if (!body) return jsonError(copy.invalidData);
    const id = String(body.id ?? `custom-${Date.now()}`).slice(0, 120);
    const name = String(body.name ?? "").trim().slice(0, 40);
    const description = String(body.description ?? "").trim().slice(0, 1_000);
    const systemPrompt = String(body.systemPrompt ?? "").trim().slice(0, 12_000);
    const icon = String(body.icon ?? "sparkles").slice(0, 50);
    const modelId = String(body.modelId ?? "gpt-5.6-sol").slice(0, 100);
    const context = isAgentCategory(body.context) ? body.context : "writing";
    if (!name || !systemPrompt) return jsonError(copy.agentFieldsRequired);
    await query(`INSERT INTO custom_agents(id,user_id,name,description,system_prompt,icon,model_id,context)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,
      description=EXCLUDED.description, system_prompt=EXCLUDED.system_prompt, icon=EXCLUDED.icon,
      model_id=EXCLUDED.model_id, context=EXCLUDED.context, updated_at=now() WHERE custom_agents.user_id=$2`,
      [id, user.id, name, description, systemPrompt, icon, modelId, context]);
    return Response.json({ agent: { id, name, description, systemPrompt, icon, modelId, category: "custom", context } });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("agent_save_failed", error);
    return jsonError(copy.agentSaveFailed, 500);
  }
}

export async function DELETE(request: Request) {
  const locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id")?.slice(0, 120);
    if (!id) return jsonError(apiAppCopy(locale).invalidData);
    await query("DELETE FROM custom_agents WHERE id=$1 AND user_id=$2", [id, user.id]);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(apiAppCopy(locale).authRequired, 401);
    return jsonError(apiAppCopy(locale).agentSaveFailed, 500);
  }
}
