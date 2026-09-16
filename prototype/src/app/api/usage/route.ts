import { alignUsageTokens } from "@/lib/credits";
import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

type UsageRow = { id:string; created_at:Date; conversation_id:string|null; chat_title:string; model:string; model_id:string|null; agent:string; input_tokens:string; output_tokens:string; billed_input_tokens:string; billed_output_tokens:string; billed_tokens:string; deleted:boolean; internal_only:boolean };

export async function GET() {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const rows = await query<UsageRow>(`SELECT id,created_at,conversation_id,chat_title,model,model_id,agent,
      coalesce(input_tokens,0)::text input_tokens,
      coalesce(output_tokens,0)::text output_tokens,
      coalesce(billed_input_tokens,0)::text billed_input_tokens,
      coalesce(billed_output_tokens,0)::text billed_output_tokens,
      billed_tokens::text,deleted,internal_only
      FROM usage_entries WHERE user_id=$1 ORDER BY created_at DESC`, [user.id]);
    return Response.json({ entries: rows.map((row) => {
      const ledger = alignUsageTokens({
        billedInput: Number(row.billed_input_tokens),
        billedOutput: Number(row.billed_output_tokens),
        billed: Number(row.billed_tokens),
        rawInput: Number(row.input_tokens),
        rawOutput: Number(row.output_tokens),
      });
      return {
        id:row.id,timestamp:row.created_at.toISOString(),conversationId:row.conversation_id ?? "",chatTitle:row.chat_title,model:row.model,modelId:row.model_id??"",agent:row.agent,
        inputTokens: ledger.inputTokens, outputTokens: ledger.outputTokens, billedTokens: ledger.billedTokens, deleted:row.deleted, failed:row.internal_only,
      };
    }) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.usageLoadFailed, 500);
  }
}

export async function POST(request: Request) {
  const copy = apiAppCopy(await requestLocale());
  if (!isSameOrigin(request)) return jsonError(copy.invalidOrigin, 403);
  void request;
  return jsonError(copy.usageServerOnly, 410);
}

export async function PATCH(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { conversationId?: unknown; locale?: unknown } | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    await query(
      "UPDATE usage_entries SET deleted=true WHERE user_id=$1 AND conversation_id=$2 AND coalesce(billed_tokens,0)=0 AND coalesce(cost_usd,0)=0",
      [user.id, String(body?.conversationId ?? "")],
    );
    return Response.json({ ok:true });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.usageUpdateFailed, 500);
  }
}
