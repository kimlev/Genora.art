import "server-only";

import { usdFromPaidTokens } from "@/lib/billing";
import { alignUsageTokens } from "@/lib/credits";
import { displayUsageAgent, usageKindFromEntry, type UsageKind } from "@/lib/usage-kind";
import { query } from "./db";

const USAGE_KINDS = new Set<UsageKind>(["chat", "image", "video", "song"]);
export function parseUsageKind(value?: string | null): UsageKind | null {
  return value && USAGE_KINDS.has(value as UsageKind) ? value as UsageKind : null;
}

type SummaryRow={users:string;clients:string;client_paid_tokens:string;client_tokens:string;active_sessions:string;requests:string;input_tokens:string;output_tokens:string;cost_usd:string;revenue_usd:string};
type UserRow={id:string;email:string;name:string|null;nickname:string|null;avatar_data_url:string|null;derived_status:string;is_administrator:boolean;balance_tokens:string;paid_balance_tokens:string;created_at:Date;conversation_count:string;request_count:string;spent_tokens:string;profit_usd:string;session_count:string;last_seen_at:Date|null};
type UsageRow={id:string;user_id:string;email:string;created_at:Date;chat_title:string;provider:string;model:string;model_id:string|null;agent:string;input_tokens:number;output_tokens:number;billed_tokens:number;administrator_id:string|null;is_administrator:boolean;cost_usd:string;revenue_usd:string;internal_only:boolean};
type SessionRow={user_id:string;session_ref:string;ip_address:string|null;country_code:string|null;user_agent:string|null;created_at:Date;last_seen_at:Date;expires_at:Date};
type ConversationRow={user_id:string;id:string;title:string;model_id:string|null;message_count:string;updated_at:Date};
type DailyRow={report_day:string;cost_usd:string;revenue_usd:string};
type AdminRow={id:string;email:string;name:string|null;nickname:string|null;timezone:string|null;active:boolean;pin_hash:string|null;ip_allowlist:string[];created_at:Date;last_login_at:Date|null};
type UserOptionRow={id:string;email:string;nickname:string|null;name:string|null};
type CatalogProviderRow={id:string;name:string};
type CatalogModelRow={id:string;name:string;provider_id:string};
type UsageTotalRow={requests:string;input_usd:string;output_usd:string;billed_tokens:string;cost_usd:string;revenue_usd:string};
type ClientTokenRow={client_tokens:string};

export const USAGE_PAGE_SIZE=25;
const USAGE_KIND=`CASE
  WHEN ue.id LIKE 'image-%' OR coalesce(ue.model_id,'') LIKE 'image:%' THEN 'image'
  WHEN ue.id LIKE 'video-%' OR coalesce(ue.model_id,'') LIKE 'video:%' THEN 'video'
  WHEN ue.id LIKE 'music-%' OR coalesce(ue.model_id,'') LIKE 'music:%' THEN 'song'
  ELSE 'chat'
END`;
const USAGE_WHERE=`ue.created_at >= $1::date AND ue.created_at < ($2::date+interval '1 day')
  AND ($3::uuid IS NULL OR ue.user_id=$3::uuid)
  AND ($4::text IS NULL OR ue.model=$4 OR ue.model_id=$4)
  AND ($5::text IS NULL OR EXISTS (
    SELECT 1 FROM ai_models m WHERE m.provider_id=$5 AND (m.id=ue.model_id OR m.display_name=ue.model)
  ) OR EXISTS (
    SELECT 1 FROM ai_providers p WHERE p.id=$5 AND (ue.provider=p.id OR ue.provider=p.display_name)
  ))
  AND ($6::text IS NULL OR (${USAGE_KIND})=$6)`;

function mapUsage(rows:UsageRow[]){
  return rows.map((row)=>{
    const adminSpend=Boolean(row.administrator_id)||row.is_administrator;
    const ledger=alignUsageTokens({ billedInput:row.input_tokens, billedOutput:row.output_tokens, billed:row.billed_tokens });
    return {
      id:row.id,
      user_id:row.user_id,
      email:row.email,
      createdAt:row.created_at.toISOString(),
      chat_title:row.chat_title,
      provider:row.provider||"—",
      model:row.model,
      kind:usageKindFromEntry(row.id,row.model_id),
      agent:displayUsageAgent(row.agent),
      input_tokens:ledger.inputTokens,
      output_tokens:ledger.outputTokens,
      billedTokens:adminSpend?0:ledger.billedTokens,
      adminSpend,
      costUsd:Number(row.cost_usd),
      revenueUsd:Number(row.revenue_usd),
      failed:row.internal_only,
    };
  });
}

export async function getAdminUsageSlice(from:string,to:string,userId?:string|null,model?:string|null,provider?:string|null,page=1,kind?:string|null){
  const safePage=Math.max(1,Math.floor(Number(page))||1);
  const offset=(safePage-1)*USAGE_PAGE_SIZE;
  const type=parseUsageKind(kind);
  const filterValues=[from,to,userId??null,model??null,provider??null,type];
  const [usage,totals,clients]=await Promise.all([
    query<UsageRow>(`SELECT ue.id,ue.user_id,u.email,ue.created_at,ue.chat_title,
      coalesce(p.display_name,ue.provider,'') provider,ue.model,ue.model_id,ue.agent,
      coalesce(ue.billed_input_tokens,0)::int input_tokens,
      coalesce(ue.billed_output_tokens,0)::int output_tokens,
      coalesce(ue.billed_tokens,0)::int billed_tokens,
      ue.administrator_id::text administrator_id,
      EXISTS(SELECT 1 FROM administrators a WHERE a.email=u.email AND a.active=true) is_administrator,
      ue.cost_usd,ue.revenue_usd,ue.internal_only
      FROM usage_entries ue JOIN users u ON u.id=ue.user_id
      LEFT JOIN ai_providers p ON p.id=ue.provider
      WHERE ${USAGE_WHERE}
      ORDER BY ue.created_at DESC LIMIT $7 OFFSET $8`,[...filterValues,USAGE_PAGE_SIZE,offset]),
    query<UsageTotalRow>(`SELECT count(*)::text requests,
      '0'::text input_usd,
      '0'::text output_usd,
      coalesce(sum(CASE WHEN ue.administrator_id IS NULL AND NOT EXISTS(SELECT 1 FROM administrators a JOIN users uu ON uu.email=a.email WHERE uu.id=ue.user_id AND a.active=true) THEN coalesce(ue.billed_tokens,0) ELSE 0 END),0)::text billed_tokens,
      coalesce(sum(ue.cost_usd),0)::text cost_usd,
      coalesce(sum(ue.revenue_usd),0)::text revenue_usd
      FROM usage_entries ue WHERE ${USAGE_WHERE}`,filterValues),
    query<ClientTokenRow>(`SELECT coalesce(sum(u.balance_tokens),0)::text client_tokens
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM balance_transactions bt
        WHERE bt.user_id=u.id AND bt.kind='top_up' AND coalesce(bt.amount_usd,0)>0
      )
      AND NOT EXISTS (SELECT 1 FROM administrators a WHERE a.email=u.email AND a.active=true)`),
  ]);
  const total=totals[0]??{requests:"0",input_usd:"0",output_usd:"0",billed_tokens:"0",cost_usd:"0",revenue_usd:"0"};
  return {
    usage:mapUsage(usage),
    usageTotals:{
      requests:Number(total.requests),
      input:Number(total.input_usd),
      output:Number(total.output_usd),
      billedTokens:Number(total.billed_tokens),
      clientTokens:Number(clients[0]?.client_tokens??0),
      costUsd:Number(total.cost_usd),
      revenueUsd:Number(total.revenue_usd),
    },
    usagePage:safePage,
    usagePageSize:USAGE_PAGE_SIZE,
    usageTotal:Number(total.requests),
  };
}

export async function getAdminDashboardData(from=new Date(Date.now()-30*86400_000).toISOString().slice(0,10),to=new Date().toISOString().slice(0,10),userId?:string|null,model?:string|null,provider?:string|null,page=1,kind?:string|null){
  const values=[from,to];
  const [summaryRows,users,usageSlice,sessions,conversations,daily,administrators,userOptions,providerOptions,modelOptions]=await Promise.all([
    query<SummaryRow>(`WITH clients AS (
        SELECT u.id, u.balance_tokens, u.paid_balance_tokens
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM balance_transactions bt
          WHERE bt.user_id=u.id AND bt.kind='top_up' AND coalesce(bt.amount_usd,0)>0
        )
      )
      SELECT
      (SELECT count(*) FROM users)::text users,
      (SELECT count(*) FROM clients)::text clients,
      (SELECT coalesce(sum(paid_balance_tokens),0) FROM clients)::text client_paid_tokens,
      (SELECT coalesce(sum(balance_tokens),0) FROM clients)::text client_tokens,
      (SELECT count(*) FROM sessions WHERE expires_at>now())::text active_sessions,
      (SELECT count(*) FROM usage_entries WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day'))::text requests,
      (SELECT coalesce(sum(coalesce(billed_input_tokens,0)),0) FROM usage_entries WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day'))::text input_tokens,
      (SELECT coalesce(sum(coalesce(billed_output_tokens,0)),0) FROM usage_entries WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day'))::text output_tokens,
      (SELECT coalesce(sum(cost_usd),0) FROM usage_entries WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day'))::text cost_usd,
      (SELECT coalesce(sum(revenue_usd),0) FROM usage_entries WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day'))::text revenue_usd`,values),
    query<UserRow>(`SELECT u.id,u.email,u.name,u.nickname,u.avatar_data_url,
      CASE WHEN u.status='blocked' THEN 'blocked'
        WHEN EXISTS(SELECT 1 FROM balance_transactions bt WHERE bt.user_id=u.id AND bt.kind='top_up' AND coalesce(bt.amount_usd,0)>0) THEN 'client'
        WHEN u.email_verified_at IS NOT NULL AND u.last_login_at IS NOT NULL AND EXISTS(SELECT 1 FROM usage_entries ux WHERE ux.user_id=u.id) THEN 'active'
        ELSE 'registration' END derived_status,
      EXISTS(SELECT 1 FROM administrators a WHERE a.email=u.email AND a.active=true) is_administrator,
      u.balance_tokens,u.paid_balance_tokens,u.created_at,
      0::text conversation_count,0::text request_count,
      coalesce((SELECT sum(ue.billed_tokens) FROM usage_entries ue WHERE ue.user_id=u.id),0)::text spent_tokens,
      coalesce((SELECT sum(ue.revenue_usd) FROM usage_entries ue WHERE ue.user_id=u.id),0)::text profit_usd,
      count(DISTINCT s.token_hash)::text session_count,max(s.last_seen_at) last_seen_at
      FROM users u
      LEFT JOIN sessions s ON s.user_id=u.id AND s.expires_at>now()
      WHERE u.created_at >= $1::date AND u.created_at < ($2::date+interval '1 day')
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`,values),
    getAdminUsageSlice(from,to,userId,model,provider,page,kind),
    query<SessionRow>(`SELECT user_id,left(token_hash,12) session_ref,host(ip_address) ip_address,country_code,user_agent,created_at,last_seen_at,expires_at
      FROM sessions WHERE expires_at>now() ORDER BY last_seen_at DESC`),
    query<ConversationRow>(`SELECT c.user_id,c.id,c.title,c.model_id,count(m.id)::text message_count,c.updated_at FROM conversations c
      LEFT JOIN messages m ON m.conversation_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 1000`),
    query<DailyRow>(`SELECT to_char(created_at,'YYYY-MM-DD') AS report_day,
        sum(cost_usd)::text cost_usd, sum(revenue_usd)::text revenue_usd
      FROM usage_entries
      WHERE created_at >= $1::date AND created_at < ($2::date+interval '1 day')
      GROUP BY 1 ORDER BY 1`,values),
    query<AdminRow>(`SELECT a.id,a.email,a.name,a.nickname,a.timezone,a.active,a.pin_hash,a.ip_allowlist,a.created_at,max(s.created_at) last_login_at
      FROM administrators a LEFT JOIN admin_sessions s ON s.administrator_id=a.id GROUP BY a.id ORDER BY a.created_at`),
    // В фильтр попадают только клиенты: администраторы своих запросов к моделям не делают
    query<UserOptionRow>(`SELECT u.id,u.email,u.nickname,u.name FROM users u
      WHERE NOT EXISTS(SELECT 1 FROM administrators a WHERE a.email=u.email AND a.active=true)
      ORDER BY u.email LIMIT 5000`),
    query<CatalogProviderRow>(`SELECT id,display_name name FROM ai_providers WHERE active=true ORDER BY display_name`),
    query<CatalogModelRow>(`SELECT m.id,m.display_name name,m.provider_id FROM ai_models m JOIN ai_providers p ON p.id=m.provider_id WHERE m.active=true AND p.active=true ORDER BY m.display_name`),
  ]);
  const summary=summaryRows[0];
  return {period:{from,to},usageUserId:userId??null,usageModel:model??null,usageProvider:provider??null,usageType:parseUsageKind(kind),summary:{users:Number(summary.users),clients:Number(summary.clients),clientFundsUsd:usdFromPaidTokens(Number(summary.client_paid_tokens)),clientTokens:Number(summary.client_tokens),activeSessions:Number(summary.active_sessions),requests:Number(summary.requests),inputTokens:Number(summary.input_tokens),outputTokens:Number(summary.output_tokens),costUsd:Number(summary.cost_usd),revenueUsd:Number(summary.revenue_usd)},
    users:users.map((row)=>({id:row.id,email:row.email,name:row.name,nickname:row.nickname,avatarDataUrl:row.avatar_data_url,status:row.is_administrator?"admin":row.derived_status,isAdministrator:row.is_administrator,balanceTokens:Number(row.balance_tokens),paidBalanceTokens:Number(row.paid_balance_tokens),conversationCount:Number(row.conversation_count),requestCount:Number(row.request_count),spentTokens:Number(row.spent_tokens),profitUsd:Number(row.profit_usd),sessionCount:Number(row.session_count),createdAt:row.created_at.toISOString(),lastSeenAt:row.last_seen_at?.toISOString()??null})),
    ...usageSlice,
    sessions:sessions.map((row)=>({user_id:row.user_id,session_ref:row.session_ref,ip_address:row.ip_address,country_code:row.country_code,user_agent:row.user_agent,createdAt:row.created_at.toISOString(),lastSeenAt:row.last_seen_at.toISOString(),expiresAt:row.expires_at.toISOString()})),
    conversations:conversations.map((row)=>({user_id:row.user_id,id:row.id,title:row.title,model_id:row.model_id,messageCount:Number(row.message_count),updatedAt:row.updated_at.toISOString()})),
    daily:daily.map((row)=>({day:row.report_day,costUsd:Number(row.cost_usd),revenueUsd:Number(row.revenue_usd)})),
    administrators:administrators.map((row)=>({id:row.id,email:row.email,name:row.name,nickname:row.nickname,timezone:row.timezone,active:row.active,hasPin:Boolean(row.pin_hash),ipAllowlist:row.ip_allowlist??[],createdAt:row.created_at.toISOString(),lastLoginAt:row.last_login_at?.toISOString()??null})),
    userOptions,
    providerOptions,
    modelOptions:modelOptions.map((row)=>({id:row.id,name:row.name,providerId:row.provider_id}))};
}
