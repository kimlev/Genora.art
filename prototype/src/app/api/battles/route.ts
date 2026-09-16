import { isPromptBlocked, publicErrorMessage } from "@/lib/public-error";
import { chatAttemptTimeoutMs, clampChatDepthForModel } from "@/lib/chat-request-policy";
import { withTransaction, query } from "@/lib/server/db";
import { executeModelRequest, MINIMUM_REQUEST_BALANCE_TOKENS, prepareRequestAttachments, recordUsage } from "@/lib/server/chat-service";
import { parseChatAttachments } from "@/lib/chat-attachments";
import { chatVideoCopy } from "@/lib/chat-video";
import { isPhotoPromptAgent, photoPromptCopy, photoPromptDisplayContent, photoPromptRequestContent } from "@/lib/photo-prompt-agent";
import { integratorProviderId } from "@/lib/provider-id";
import {
  isVideoPromptAgent,
  videoPromptModelAllowed,
  videoPromptProviderIdForModel,
  videoPromptDisplayContent,
} from "@/lib/video-prompt-agent";
import { resolveVideoPromptInstruction } from "@/lib/server/system-agents";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { requireUser } from "@/lib/server/session";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy, type ApiAppCopy } from "@/lib/i18n/copy/api-app";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import type { BattleAnswer, BattleDepth, BattleRound, BattleSession, BattleSideSettings } from "@/lib/battle-history";

export const runtime = "nodejs";
export const maxDuration = 3000;

type BattleSideBody = { provider?:unknown;model?:unknown;depth?:unknown };
type BattleBody = { sessionId?:unknown;prompt?:unknown;agentId?:unknown;left?:BattleSideBody;right?:BattleSideBody;attachments?:unknown;timezone?:unknown;locale?:unknown };
type SessionRow = { id:string;title:string;agent_id:string|null;left_provider:string;left_model:string;left_depth:BattleDepth;right_provider:string;right_model:string;right_depth:BattleDepth;updated_at:Date };
type RoundRow = { id:string;session_id:string;prompt:string;preferred_side:"left"|"right"|null;created_at:Date;left_provider:string;left_model:string;left_depth:BattleDepth;right_provider:string;right_model:string;right_depth:BattleDepth;side:"left"|"right";model_id:string;content:string;billed_input_tokens:string;billed_output_tokens:string;thinking_ms:number };
type PartialBattleRound=Omit<BattleRound,"left"|"right">&{sessionId:string;left:BattleAnswer|null;right:BattleAnswer|null};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const depth = (value: unknown): BattleDepth => ["fast","balanced","deep"].includes(String(value)) ? String(value) as BattleDepth : "balanced";
const titleFromPrompt = (prompt: string, fallback: string) => (prompt.replace(/[\n\r]+/g," ").trim().slice(0,80) || fallback);
const settings = (provider:string,model:string,selectedDepth:BattleDepth):BattleSideSettings => ({provider,model,depth:selectedDepth});

export async function GET() {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const sessions = await query<SessionRow>(`SELECT id,title,agent_id,left_provider,left_model,left_depth,right_provider,right_model,right_depth,updated_at
      FROM battle_sessions WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100`,[user.id]);
    if (!sessions.length) return Response.json({sessions:[]});
    const ids = sessions.map((item)=>item.id);
    const rows = await query<RoundRow>(`SELECT battle.id,battle.session_id,battle.prompt,battle.preferred_side,battle.created_at,
      battle.left_provider,battle.left_model,battle.left_depth,battle.right_provider,battle.right_model,battle.right_depth,
      response.side,response.model_id,response.content,response.billed_input_tokens::text,response.billed_output_tokens::text,response.thinking_ms
      FROM model_battles battle JOIN battle_responses response ON response.battle_id=battle.id
      WHERE battle.session_id=ANY($1::uuid[]) ORDER BY battle.created_at,response.side`,[ids]);
    const rounds = new Map<string,PartialBattleRound>();
    for (const row of rows) {
      const current = rounds.get(row.id) ?? {
        id:row.id,sessionId:row.session_id,prompt:row.prompt,preferred:row.preferred_side,createdAt:row.created_at.toISOString(),
        leftSettings:settings(row.left_provider,row.left_model,row.left_depth),rightSettings:settings(row.right_provider,row.right_model,row.right_depth),
        left:null,right:null,
      };
      const answer:BattleAnswer={model:row.model_id,content:row.content,inputTokens:Number(row.billed_input_tokens),outputTokens:Number(row.billed_output_tokens),thinkingMs:row.thinking_ms};
      current[row.side]=answer;
      rounds.set(row.id,current);
    }
    const payload:BattleSession[]=sessions.map((session)=>({
      id:session.id,title:session.title,agentId:session.agent_id,updatedAt:session.updated_at.toISOString(),
      left:settings(session.left_provider,session.left_model,session.left_depth),right:settings(session.right_provider,session.right_model,session.right_depth),
      rounds:Array.from(rounds.values()).filter((round)=>round.sessionId===session.id&&round.left&&round.right).map((round)=>({id:round.id,prompt:round.prompt,preferred:round.preferred,createdAt:round.createdAt,leftSettings:round.leftSettings,rightSettings:round.rightSettings,left:round.left!,right:round.right!})),
    }));
    return Response.json({sessions:payload});
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired,401);
    console.error("battle_history_load_failed",error);
    return jsonError(appCopy.battlesLoadFailed,500);
  }
}

type ExecutedBattle = Awaited<ReturnType<typeof executeModelRequest>>;
type SideRun = { ok: true; executed: ExecutedBattle } | { ok: false; modelId: string; error: string };

function publicBattleError(error: unknown, copy: ApiAppCopy): string {
  if (!(error instanceof Error)) return copy.modelNoAnswer;
  if (error.name === "TimeoutError" || error.name === "AbortError") return copy.modelTimedOut;
  const message = error.message.trim();
  if (isPromptBlocked(message)) return publicErrorMessage(message);
  if (message === "INSUFFICIENT_BALANCE" || message === "ANSWER_REQUIRES_TOP_UP") return copy.topUpToSeeAnswer;
  if (message === "MODEL_NOT_AVAILABLE") return copy.modelUnavailable;
  if (message === "INTEGRATOR_NOT_CONFIGURED") return copy.modelServiceUnavailable;
  if (/timeout|aborted|AbortError/i.test(message)) return copy.modelTimedOut;
  if (message.startsWith("ATTACHMENT_INVALID:")) return message.slice("ATTACHMENT_INVALID:".length);
  if (message.startsWith("IntegratorAI HTTP")) return copy.modelNoAnswer;
  return message.slice(0, 280) || copy.modelNoAnswer;
}

function failedAnswer(modelId: string, reason: string, copy: ApiAppCopy): BattleAnswer {
  return { model: modelId, content: `${copy.failedAnswerPrefix}\n\n${reason}`, inputTokens: 0, outputTokens: 0, thinkingMs: 0 };
}

function successfulAnswer(executed: ExecutedBattle): BattleAnswer {
  return {
    model: executed.pricing.modelId,
    content: executed.result.choices[0]?.message.content ?? "",
    inputTokens: executed.pricing.billedInputTokens,
    outputTokens: executed.pricing.billedOutputTokens,
    thinkingMs: executed.result.meta.latency_ms,
  };
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as BattleBody | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = usageHistoryCopy(locale);
    const appCopy = apiAppCopy(locale);
    const prompt = String(body?.prompt ?? "").trim().slice(0,100_000);
    const agentId = body?.agentId ? String(body.agentId).slice(0, 120) : null;
    const videoPrompt = isVideoPromptAgent(agentId);
    const photoPrompt = isPhotoPromptAgent(agentId);
    const attachments = parseChatAttachments(body?.attachments, locale);
    if (videoPrompt) {
      if (attachments.some((item) => item.kind !== "video")) return jsonError(chatVideoCopy(locale).videoOnlyGemini);
      if (!attachments.some((item) => item.kind === "video")) return jsonError(chatVideoCopy(locale).videoRequired);
    } else if (photoPrompt) {
      if (attachments.some((item) => item.kind !== "image")) return jsonError(photoPromptCopy(locale).photosOnly);
      if (!attachments.some((item) => item.kind === "image")) return jsonError(photoPromptCopy(locale).photoRequired);
    } else if (attachments.some((item) => item.kind === "video")) {
      return jsonError(appCopy.invalidRequest);
    }
    const left = body?.left; const right = body?.right;
    if (videoPrompt && left && right) {
      if (!videoPromptModelAllowed(String(left.model)) || !videoPromptModelAllowed(String(right.model))) {
        return jsonError(appCopy.battleInvalidData);
      }
      left.provider = videoPromptProviderIdForModel(String(left.model));
      right.provider = videoPromptProviderIdForModel(String(right.model));
    } else {
      if (left) left.provider = integratorProviderId(String(left.provider ?? ""));
      if (right) right.provider = integratorProviderId(String(right.provider ?? ""));
    }
    const requestedSessionId=String(body?.sessionId??"");
    if (requestedSessionId&&!uuidPattern.test(requestedSessionId)) return jsonError(appCopy.battleInvalid);
    if ((!prompt && !attachments.length) || !left?.model || !right?.model || !left.provider || !right.provider) return jsonError(appCopy.battleInvalidData);
    const sourcePrompt = prompt === copy.reviewAttachment ? "" : prompt;
    const displayPrompt = videoPrompt
      ? videoPromptDisplayContent(sourcePrompt, locale)
      : photoPrompt
        ? photoPromptDisplayContent(sourcePrompt, locale)
        : prompt;
    const requestPrompt = videoPrompt
      ? await resolveVideoPromptInstruction()
      : photoPrompt
        ? photoPromptRequestContent()
        : prompt;
    const leftDepth=clampChatDepthForModel(String(left.model),depth(left.depth));const rightDepth=clampChatDepthForModel(String(right.model),depth(right.depth));
    const preparedAttachments = await prepareRequestAttachments(attachments, locale);
    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[user.id]);
      const balance=await client.query<{balance_tokens:string}>("SELECT balance_tokens FROM users WHERE id=$1 FOR UPDATE",[user.id]);
      const balanceTokens=Number(balance.rows[0]?.balance_tokens??0);
      if(balanceTokens<MINIMUM_REQUEST_BALANCE_TOKENS)throw new Error("INSUFFICIENT_BALANCE");
      const sideBillingBudget=Math.floor(balanceTokens/2);
      let sessionId=requestedSessionId;
      if(sessionId){
        const owned=await client.query("SELECT id FROM battle_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",[sessionId,user.id]);
        if(!owned.rowCount)throw new Error("BATTLE_NOT_FOUND");
        await client.query(`UPDATE battle_sessions SET agent_id=$3,left_provider=$4,left_model=$5,left_depth=$6,
          right_provider=$7,right_model=$8,right_depth=$9,updated_at=now() WHERE id=$1 AND user_id=$2`,
        [sessionId,user.id,agentId,String(left.provider),String(left.model),leftDepth,String(right.provider),String(right.model),rightDepth]);
      }else{
        const created=await client.query<{id:string}>(`INSERT INTO battle_sessions(user_id,title,agent_id,left_provider,left_model,left_depth,right_provider,right_model,right_depth)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[user.id,titleFromPrompt(displayPrompt, copy.newBattle),agentId,String(left.provider),String(left.model),leftDepth,String(right.provider),String(right.model),rightDepth]);
        sessionId=created.rows[0].id;
      }
      const battle = await client.query<{id:string}>(`INSERT INTO model_battles(session_id,user_id,prompt,agent_id,left_provider,left_model,left_depth,right_provider,right_model,right_depth)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [sessionId,user.id,displayPrompt,agentId,String(left.provider),String(left.model),leftDepth,String(right.provider),String(right.model),rightDepth]);
      return { sessionId, battleId: battle.rows[0].id, sideBillingBudget, startingBalance: balanceTokens };
    });
    const runSide = async (side: "left"|"right", sideSettings: BattleSideBody): Promise<SideRun> => {
      const modelId = String(sideSettings.model);
      try {
        const executed = await executeModelRequest({
          userId: user.id,
          providerId: String(sideSettings.provider),
          modelId,
          prompt: videoPrompt || photoPrompt ? requestPrompt : (prompt || copy.reviewAttachment),
          attachments,
          preparedAttachments,
          depth: clampChatDepthForModel(modelId, depth(sideSettings.depth)),
          agentId,
          chatId: `ms-battle-${user.id.slice(0,8)}-${setup.sessionId}-${side}`,
          source: appCopy.battleSource(setup.sessionId),
          timezone: String(body?.timezone ?? "").slice(0,80) || undefined,
          billingBudgetTokens: setup.sideBillingBudget,
          webSearch: false,
          timeoutMs: chatAttemptTimeoutMs(modelId, depth(sideSettings.depth)),
          locale,
        });
        return { ok: true, executed };
      } catch (error) {
        console.error("battle_side_failed", side, modelId, error instanceof Error ? error.message : "unknown");
        return { ok: false, modelId, error: publicBattleError(error, appCopy) };
      }
    };
    const [leftRun, rightRun] = await Promise.all([runSide("left", left), runSide("right", right)]);
    const leftAnswer = leftRun.ok ? successfulAnswer(leftRun.executed) : failedAnswer(leftRun.modelId, leftRun.error, appCopy);
    const rightAnswer = rightRun.ok ? successfulAnswer(rightRun.executed) : failedAnswer(rightRun.modelId, rightRun.error, appCopy);
    let balanceTokens = setup.startingBalance;
    try {
      const persisted = await withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[user.id]);
        await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE",[user.id]);
        for (const [side, run, answer] of [["left", leftRun, leftAnswer], ["right", rightRun, rightAnswer]] as const) {
          await client.query(`INSERT INTO battle_responses(battle_id,side,model_id,content,input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,thinking_ms)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [setup.battleId, side, answer.model, answer.content,
            run.ok ? run.executed.result.usage.prompt_tokens : 0, run.ok ? run.executed.result.usage.completion_tokens : 0,
            answer.inputTokens, answer.outputTokens, answer.thinkingMs]);
          if (run.ok) {
            const usage = await recordUsage({ client, userId: user.id, result: run.executed.result, pricing: run.executed.pricing, battleId: setup.battleId,
              chatTitle: copy.battleChatTitle(displayPrompt), agentName: run.executed.agentName,
              integratorChatId: `ms-battle-${user.id.slice(0,8)}-${setup.sessionId}-${side}`, usageId: `battle-${setup.battleId}-${side}`, locale });
            if (usage.balanceTokens < 0) {
              answer.content = appCopy.topUpToSeeAnswer;
              await client.query(`UPDATE battle_responses SET content=$3 WHERE battle_id=$1 AND side=$2`,
                [setup.battleId, side, appCopy.topUpToSeeAnswer]);
            }
          }
        }
        await client.query("UPDATE battle_sessions SET updated_at=now() WHERE id=$1 AND user_id=$2",[setup.sessionId, user.id]);
        const remaining=await client.query<{balance_tokens:string}>("SELECT balance_tokens FROM users WHERE id=$1",[user.id]);
        return Number(remaining.rows[0]?.balance_tokens??0);
      });
      balanceTokens = persisted;
    } catch (error) {
      console.error("battle_persist_failed", error instanceof Error ? error.message : "unknown");
    }
    return Response.json({ sessionId: setup.sessionId, id: setup.battleId, left: leftAnswer, right: rightAnswer, balanceTokens }, { status: 201 });
  } catch (error) {
    const errorCopy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    if ((error as Error).message === "INSUFFICIENT_BALANCE" || (error as Error).message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errorCopy.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    if ((error as Error).message === "BATTLE_NOT_FOUND") return jsonError(errorCopy.battleNotFound,404);
    if ((error as Error).message.startsWith("ATTACHMENT_INVALID:")) return jsonError((error as Error).message.slice("ATTACHMENT_INVALID:".length), 400);
    console.error("battle_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(errorCopy.battleFailed, 502);
  }
}

export async function PATCH(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as {id?:unknown;preferredSide?:unknown;sessionId?:unknown;title?:unknown;locale?:unknown}|null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const side = body?.preferredSide === "left" || body?.preferredSide === "right" ? body.preferredSide : null;
    if(side){
      await query("UPDATE model_battles SET preferred_side=$3 WHERE id=$1 AND user_id=$2", [String(body?.id??""),user.id,side]);
      return Response.json({ok:true});
    }
    const sessionId=String(body?.sessionId??"");const title=String(body?.title??"").trim().slice(0,80);
    if(!uuidPattern.test(sessionId)||!title)return jsonError(apiAppCopy(locale).invalidTitle);
    await query("UPDATE battle_sessions SET title=$3,updated_at=now() WHERE id=$1 AND user_id=$2",[sessionId,user.id,title]);
    return Response.json({ok:true});
  } catch (error) {
    const errorCopy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    return jsonError(errorCopy.changesSaveFailed, 500);
  }
}

export async function DELETE(request:Request){
  const params=new URL(request.url).searchParams;
  const copy=apiAppCopy(await requestLocale(params.get("locale")));
  if(!isSameOrigin(request))return jsonError(copy.invalidOrigin,403);
  try{
    const user=await requireUser();const sessionId=params.get("sessionId")??"";
    if(!uuidPattern.test(sessionId))return jsonError(copy.battleInvalid);
    await query("DELETE FROM battle_sessions WHERE id=$1 AND user_id=$2",[sessionId,user.id]);
    return Response.json({ok:true});
  }catch(error){
    if((error as Error).message==="UNAUTHORIZED")return jsonError(copy.authRequired,401);
    return jsonError(copy.battleDeleteFailed,500);
  }
}
