import { formatTokensAsCredits } from "@/lib/credits";

export type Section="overview"|"users"|"usage"|"pnl"|"finance"|"seo"|"admins"|"support"|"multipliers"|"payments"|"settings"|"marketing"|"requests"|"agents"|"models"|"youtube"|"youtube-connect"|"youtube-research"|"youtube-plan"|"youtube-script"|"youtube-package"|"youtube-production"|"youtube-publish"|"youtube-analytics";
const ADMIN_SECTIONS: readonly Section[]=["overview","users","usage","pnl","finance","seo","admins","support","multipliers","payments","settings","marketing","requests","agents","models","youtube","youtube-connect","youtube-research","youtube-plan","youtube-script","youtube-package","youtube-production","youtube-publish","youtube-analytics"];
export function parseAdminSection(value: unknown): Section {
  return typeof value==="string" && ADMIN_SECTIONS.includes(value as Section) ? value as Section : "overview";
}

export type AdminUser={id:string;email:string;name:string|null;nickname:string|null;avatarDataUrl:string|null;status:string;isAdministrator:boolean;balanceTokens:number;paidBalanceTokens:number;createdAt:string;conversationCount:number;requestCount:number;spentTokens:number;profitUsd:number;sessionCount:number;lastSeenAt:string|null};
export type UsageKind="chat"|"image"|"video"|"song";
export type UsageEntry={id:string;requestId:string;requestStatus:"running"|"success"|"error";user_id:string;email:string;createdAt:string;chat_title:string;provider:string;model:string;kind:UsageKind;agent:string;input_tokens:number;output_tokens:number;billedTokens:number;adminSpend:boolean;costUsd:number;revenueUsd:number;failed:boolean};
export type AdminItem={id:string;email:string;name:string|null;nickname:string|null;timezone:string|null;active:boolean;hasPin:boolean;ipAllowlist:string[];createdAt:string;lastLoginAt:string|null};

export type DashboardData={
  period:{from:string;to:string};usageUserId:string|null;usageModel:string|null;usageProvider:string|null;usageType:UsageKind|null;
  summary:{users:number;clients:number;clientFundsUsd:number;clientTokens:number;activeSessions:number;requests:number;inputTokens:number;outputTokens:number;costUsd:number;revenueUsd:number};
  users:AdminUser[];userOptions:Array<{id:string;email:string;nickname:string|null;name:string|null}>;providerOptions:Array<{id:string;name:string}>;modelOptions:Array<{id:string;name:string;providerId:string}>;usage:UsageEntry[];
  usageTotals:{requests:number;input:number;output:number;billedTokens:number;clientTokens:number;costUsd:number;revenueUsd:number};usagePage:number;usagePageSize:number;usageTotal:number;
  sessions:Array<{user_id:string;session_ref:string;ip_address:string|null;country_code:string|null;user_agent:string|null;createdAt:string;lastSeenAt:string;expiresAt:string}>;
  conversations:Array<{user_id:string;id:string;title:string;model_id:string|null;messageCount:number;updatedAt:string}>;
  daily:Array<{day:string;costUsd:number;revenueUsd:number}>;administrators:AdminItem[];
};

export type UserDetail={
  user:{id:string;email:string;name:string|null;nickname:string|null;avatar_data_url:string|null;balanceTokens:number;paidBalanceTokens:number;status:string;createdAt:string};
  welcomeBonus?: import("@/lib/welcome-bonus").WelcomeBonusProgress | null;
  transactions:Array<{id:string;kind:string;tokenDelta:number;amountUsd:number|null;note:string;payment_provider:string|null;payment_reference:string|null;createdAt:string}>;
  usage:Array<{id:string;chat_title:string;model:string;agent:string;input_tokens:number;output_tokens:number;billedTokens:number;costUsd:number;revenueUsd:number;createdAt:string;failed:boolean}>;
  sessions:Array<{session_ref:string;ip_address:string|null;country_code:string|null;user_agent:string|null;lastSeenAt:string;expiresAt:string}>;
  conversations:Array<{id:string;title:string;model_id:string|null;messageCount:number;updatedAt:string}>;
};

export const money=(value:number)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:4}).format(value);
export const number=(value:number)=>new Intl.NumberFormat("ru-RU").format(value);
export function tokens(value:number,signed=false){
  const formatted=formatTokensAsCredits(Math.abs(Number.isFinite(value)?value:0),"ru","spend");
  if(!signed) return formatted;
  if(value>0) return `+${formatted}`;
  if(value<0) return `−${formatted}`;
  return formatted;
}
export const date=(value:string|null)=>value?new Intl.DateTimeFormat("ru-RU",{dateStyle:"short",timeStyle:"short"}).format(new Date(value)):"—";
export const th="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500";
export const td="border-t border-slate-800 px-2 py-2 text-xs text-slate-300";
