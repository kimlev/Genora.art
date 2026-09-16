import "server-only";

import { integratorChat } from "@/lib/server/integrator";
import { query, withTransaction } from "@/lib/server/db";
import { integratorProviderId } from "@/lib/provider-id";
import { looksLikeRussian, pickCheapestTextModel, sourceTextForTranslation, TRANSLATION_PROMPT, translationUsageTitle } from "@/lib/support-translation";

type SupportAdmin = { id: string; email: string; name: string | null };
type TranslateModel = { id: string; provider_id: string; display_name: string; cost: number };

async function translationModel(): Promise<TranslateModel> {
  const candidates = await query<TranslateModel>(`SELECT id,provider_id,display_name,
      COALESCE(cost_input_per_1m_usd, 999) + COALESCE(cost_output_per_1m_usd, 999) AS cost
    FROM ai_models
    WHERE active=true
      AND COALESCE(capabilities->>'kind', 'chat') NOT IN ('image', 'video', 'music')
      AND id NOT LIKE 'video:%'
      AND id NOT LIKE 'image:%'
      AND id NOT LIKE 'music:%'
      AND id NOT ILIKE '%image%'
      AND id NOT ILIKE '%audio%'
      AND id NOT ILIKE '%video%'
    ORDER BY
      CASE WHEN COALESCE(cost_input_per_1m_usd, 1) + COALESCE(cost_output_per_1m_usd, 1) = 0 THEN 0 ELSE 1 END,
      COALESCE(cost_input_per_1m_usd, 999) + COALESCE(cost_output_per_1m_usd, 999) ASC,
      baseline_score DESC NULLS LAST
    LIMIT 40`);
  const chosen = pickCheapestTextModel(candidates);
  if (!chosen) throw new Error("SUPPORT_MODEL_NOT_AVAILABLE");
  return chosen;
}

export async function translateSupportRequest(input: {
  id: string;
  admin: SupportAdmin;
  force?: boolean;
}): Promise<{ translationRu: string; alreadyTranslated: boolean }> {
  const support = (await query<{
    id: string;
    public_id: string;
    translation_ru: string | null;
  }>("SELECT id,public_id,translation_ru FROM support_requests WHERE id=$1", [input.id]))[0];
  if (!support) throw new Error("SUPPORT_NOT_FOUND");
  if (support.translation_ru && looksLikeRussian(support.translation_ru) && !input.force) {
    return { translationRu: support.translation_ru, alreadyTranslated: true };
  }

  const inbound = await query<{ content: string }>(`SELECT content FROM support_request_messages
    WHERE support_request_id=$1 AND direction='inbound' ORDER BY created_at,id`, [support.id]);
  const source = sourceTextForTranslation(inbound.map((row) => row.content).join("\n\n") || "");
  if (!source) throw new Error("SUPPORT_EMPTY_SOURCE");

  const model = await translationModel();
  const first = await integratorChat({
    provider: integratorProviderId(model.provider_id),
    model: model.id,
    chatId: `support-translate-${support.id}`,
    memoryDepth: "shallow",
    source: "Genora.art · Перевод обращения",
    maxOutputTokens: 4_000,
    messages: [
      { role: "system", content: TRANSLATION_PROMPT },
      { role: "user", content: `Переведи на русский:\n\n${source}` },
    ],
  });
  let translationRu = first.choices[0]?.message.content.trim() ?? "";
  let result = first;
  if (translationRu && !looksLikeRussian(translationRu)) {
    const retry = await integratorChat({
      provider: integratorProviderId(model.provider_id),
      model: model.id,
      chatId: `support-translate-${support.id}-ru`,
      memoryDepth: "shallow",
      source: "Genora.art · Перевод обращения",
      maxOutputTokens: 4_000,
      messages: [
        { role: "system", content: TRANSLATION_PROMPT },
        { role: "user", content: `Это должен быть перевод на русский язык кириллицей, не на китайский.\n\n${source}` },
      ],
    });
    const retried = retry.choices[0]?.message.content.trim() ?? "";
    if (looksLikeRussian(retried)) {
      translationRu = retried;
      result = retry;
    }
  }
  if (!translationRu) throw new Error("SUPPORT_EMPTY_TRANSLATION");
  if (!looksLikeRussian(translationRu)) throw new Error("SUPPORT_NOT_RUSSIAN");

  const title = translationUsageTitle(support.public_id);
  const promptTokens = result.usage.prompt_tokens;
  const completionTokens = result.usage.completion_tokens;
  const saved = await query<{ translation_ru: string }>(`UPDATE support_requests
    SET translation_ru=$2, translated_at=now()
    WHERE id=$1
    RETURNING translation_ru`, [support.id, translationRu]);
  if (saved[0]) {
    try {
      await withTransaction(async (client) => {
        const account = await client.query<{ id: string }>("SELECT id FROM users WHERE email=$1", [input.admin.email]);
        let userId = account.rows[0]?.id;
        if (!userId) {
          const adminHash = await client.query<{ password_hash: string }>("SELECT password_hash FROM administrators WHERE id=$1", [input.admin.id]);
          const created = await client.query<{ id: string }>(`INSERT INTO users(email,password_hash,name,status,email_verified_at,balance_tokens)
            VALUES($1,$2,$3,'blocked',now(),0) RETURNING id`, [input.admin.email, adminHash.rows[0].password_hash, input.admin.name ?? "Администратор"]);
          userId = created.rows[0].id;
        }
        const requestId = result.id || `translate-${support.id}`;
        await client.query(`INSERT INTO usage_entries(id,user_id,administrator_id,chat_title,model,model_id,provider,agent,
          input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,billing_multiplier,
          cost_usd,revenue_usd,tool_cost_usd,latency_ms,integrator_chat_id,upstream_request_id,usage_comment)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,$14,0,$15,$16,$17,$18,$19)
          ON CONFLICT DO NOTHING`,
        [
          `translate-${requestId}`,
          userId,
          input.admin.id,
          title,
          model.display_name,
          model.id,
          model.provider_id,
          title,
          promptTokens,
          completionTokens,
          promptTokens,
          completionTokens,
          promptTokens + completionTokens,
          result.usage.cost_usd,
          result.usage.tool_cost_usd ?? 0,
          result.meta.latency_ms,
          requestId,
          requestId,
          title,
        ]);
      });
    } catch (error) {
      console.error("support_translate_usage_failed", error instanceof Error ? error.message : "unknown");
    }
  }

  const stored = (await query<{ translation_ru: string }>("SELECT translation_ru FROM support_requests WHERE id=$1", [support.id]))[0];
  return { translationRu: stored?.translation_ru ?? translationRu, alreadyTranslated: false };
}
