-- Verified against Genora.art's Integrator /v1/models on 2026-09-09.
-- Preserve any existing synchronized prices, custom markup and capabilities.
INSERT INTO ai_providers(id,display_name,sort_order)
VALUES ('openai','OpenAI',10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_models (
  id,provider_id,display_name,active,cost_input_per_1m_usd,cost_cached_input_per_1m_usd,
  cost_output_per_1m_usd,client_input_per_1m_usd,client_cached_input_per_1m_usd,
  client_output_per_1m_usd,markup_multiplier,baseline_score,baseline_votes,capabilities,source_updated_at,synced_at
)
SELECT 'gpt-6-astra',id,'GPT-6 Astra',true,10.3,1.03,51.5,
  10.3*billing_multiplier,1.03*billing_multiplier,51.5*billing_multiplier,
  billing_multiplier,0,0,
  '{"temperature":{"mode":"fixed","value":1},"topP":{"mode":"fixed","value":1},"reasoning":{"defaultValue":"medium","options":[{"value":"low"},{"value":"medium"},{"value":"high"},{"value":"xhigh"},{"value":"max"}]},"averageRequestCostUsd":null,"pricingSource":"official","pricingSourceUrl":"https://developers.openai.com/api/docs/models"}'::jsonb,
  '2026-09-09T00:00:00Z'::timestamptz,now()
FROM ai_providers WHERE id='openai'
ON CONFLICT (id) DO NOTHING;
