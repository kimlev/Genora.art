import { alignUsageTokens } from "@/lib/credits";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { adminBonusTokens } from "@/lib/admin-bonus";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import { query, withTransaction } from "@/lib/server/db";
import { creditUserTokens } from "@/lib/server/paid-balance";
import { getWelcomeBonusProgress } from "@/lib/server/welcome-bonus";
import { SITE_ORIGIN } from "@/lib/site-env";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/request-meta";

export const runtime="nodejs";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireAdmin(); const {id}=await params;
    const users=await query<{id:string;email:string;name:string|null;nickname:string|null;avatar_data_url:string|null;balance_tokens:string;paid_balance_tokens:string;status:string;created_at:Date}>(`SELECT u.id,u.email,u.name,u.nickname,u.avatar_data_url,u.balance_tokens,u.paid_balance_tokens,u.created_at,
      CASE WHEN u.status='blocked' THEN 'blocked' WHEN EXISTS(SELECT 1 FROM balance_transactions bt WHERE bt.user_id=u.id AND bt.kind='top_up' AND coalesce(bt.amount_usd,0)>0) THEN 'client'
      WHEN u.email_verified_at IS NOT NULL AND u.last_login_at IS NOT NULL AND EXISTS(SELECT 1 FROM usage_entries ue WHERE ue.user_id=u.id) THEN 'active' ELSE 'registration' END status
      FROM users u WHERE u.id=$1`,[id]);
    if(!users[0]) return jsonError("Пользователь не найден",404);
    const [transactions,usage,sessions,conversations]=await Promise.all([
      query<{id:string;kind:string;token_delta:string;amount_usd:string|null;note:string;payment_provider:string|null;payment_reference:string|null;created_at:Date}>("SELECT id,kind,token_delta,amount_usd,note,payment_provider,payment_reference,created_at FROM balance_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200",[id]),
      query<{id:string;chat_title:string;model:string;agent:string;billed_input_tokens:string;billed_output_tokens:string;raw_input_tokens:string;raw_output_tokens:string;billed_tokens:string;cost_usd:string;revenue_usd:string;created_at:Date;internal_only:boolean}>(`SELECT id,chat_title,model,agent,
        coalesce(billed_input_tokens,0)::text billed_input_tokens,
        coalesce(billed_output_tokens,0)::text billed_output_tokens,
        coalesce(input_tokens,0)::text raw_input_tokens,
        coalesce(output_tokens,0)::text raw_output_tokens,
        billed_tokens::text,cost_usd::text,revenue_usd::text,created_at,internal_only
        FROM usage_entries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300`,[id]),
      query<{session_ref:string;ip_address:string|null;country_code:string|null;user_agent:string|null;last_seen_at:Date;expires_at:Date}>("SELECT left(token_hash,12) session_ref,host(ip_address) ip_address,country_code,user_agent,last_seen_at,expires_at FROM sessions WHERE user_id=$1 ORDER BY last_seen_at DESC",[id]),
      query<{id:string;title:string;model_id:string|null;updated_at:Date;message_count:string}>("SELECT c.id,c.title,c.model_id,c.updated_at,count(m.id)::text message_count FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id WHERE c.user_id=$1 GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 200",[id]),
    ]);
    const welcomeBonus = await getWelcomeBonusProgress(id, SITE_ORIGIN);
    return Response.json({user:{...users[0],balanceTokens:Number(users[0].balance_tokens),paidBalanceTokens:Number(users[0].paid_balance_tokens),createdAt:users[0].created_at.toISOString()},welcomeBonus,transactions:transactions.map((row)=>({...row,tokenDelta:Number(row.token_delta),amountUsd:row.amount_usd===null?null:Number(row.amount_usd),createdAt:row.created_at.toISOString()})),usage:usage.map((row)=>{
      const ledger=alignUsageTokens({
        billedInput:Number(row.billed_input_tokens),
        billedOutput:Number(row.billed_output_tokens),
        billed:Number(row.billed_tokens),
        rawInput:Number(row.raw_input_tokens),
        rawOutput:Number(row.raw_output_tokens),
      });
      return {id:row.id,chat_title:row.chat_title,model:row.model,agent:row.agent,input_tokens:ledger.inputTokens,output_tokens:ledger.outputTokens,billedTokens:ledger.billedTokens,costUsd:Number(row.cost_usd),revenueUsd:Number(row.revenue_usd),createdAt:row.created_at.toISOString(),failed:row.internal_only};
    }),sessions:sessions.map((row)=>({...row,lastSeenAt:row.last_seen_at.toISOString(),expiresAt:row.expires_at.toISOString()})),conversations:conversations.map((row)=>({...row,messageCount:Number(row.message_count),updatedAt:row.updated_at.toISOString()}))});
  }catch(error){if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);console.error("admin_user_detail_failed",error);return jsonError("Не удалось загрузить пользователя",500);}
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request)) return jsonError("Недопустимый источник запроса",403);
  try{
    const admin=await requireAdmin();const {id}=await params;const body=await request.json().catch(()=>null) as {action?:unknown;tokenAmount?:unknown;blocked?:unknown}|null;
    if(body?.action==="grant_bonus"){
      const tokenAmount=adminBonusTokens(body.tokenAmount);
      if(tokenAmount===null) return jsonError("Можно начислить от 5 до 1 000 целых токенов");
      const meta=requestMeta(request);
      const result=await withTransaction(async(client)=>{
        let updated:{balanceTokens:number};
        try{
          updated=await creditUserTokens(client,id,tokenAmount,0);
        }catch(error){
          if((error as Error).message==="USER_NOT_FOUND") return null;
          throw error;
        }
        const localeRow=await client.query<{locale:string|null}>("SELECT locale FROM users WHERE id=$1",[id]);
        const note=usageHistoryCopy(localeRow.rows[0]?.locale).bonus(tokenAmount);
        await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note) VALUES($1,'bonus',$2,$3)",[id,tokenAmount,note]);
        await client.query(`INSERT INTO admin_audit_log(administrator_id,action,entity_type,entity_id,metadata,ip_address)
          VALUES($1,'user.balance_bonus','user',$2,$3,$4)`,[admin.id,id,{tokenAmount,balanceTokens:updated.balanceTokens},meta.ipAddress]);
        return {balanceTokens:updated.balanceTokens};
      });
      if(!result) return jsonError("Пользователь не найден",404);
      return Response.json({ok:true,...result});
    }
    if(typeof body?.blocked!=="boolean") return jsonError("Некорректный статус");
    const rows=await query<{id:string;status:string}>(`UPDATE users u SET status=CASE WHEN $2::boolean THEN 'blocked' ELSE CASE
      WHEN EXISTS(SELECT 1 FROM balance_transactions bt WHERE bt.user_id=u.id AND bt.kind='top_up' AND coalesce(bt.amount_usd,0)>0) THEN 'client'
      WHEN u.email_verified_at IS NOT NULL AND u.last_login_at IS NOT NULL AND EXISTS(SELECT 1 FROM usage_entries ue WHERE ue.user_id=u.id) THEN 'active'
      ELSE 'registration' END END,updated_at=now() WHERE id=$1 RETURNING id,status`,[id,body.blocked]);
    if(!rows[0]) return jsonError("Пользователь не найден",404);
    await auditAdmin(request,admin.id,body.blocked?"user.block":"user.unblock","user",id);
    return Response.json({ok:true,status:rows[0].status});
  }catch(error){if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);console.error("admin_user_update_failed",error);return jsonError("Не удалось обновить пользователя",500);}
}
