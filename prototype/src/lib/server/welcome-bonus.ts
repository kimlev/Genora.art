import "server-only";

import { randomBytes } from "node:crypto";
import {
  DEFAULT_WELCOME_BONUS_CONFIG,
  nextLoginDays,
  parseWelcomeBonusConfig,
  taskEarnedTokens,
  utcDateString,
  welcomeBonusCreditAt,
  welcomeBonusTotal,
  type WelcomeBonusConfig,
  type WelcomeBonusProgress,
  type WelcomeBonusTaskId,
} from "@/lib/welcome-bonus";
import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/server/db";

type CampaignRow = {
  user_id: string;
  version: number;
  config: WelcomeBonusConfig;
  started_at: Date;
  user_created_at?: Date;
  ends_at: Date;
  credited_at: Date | null;
  dismissed_on: string | null;
  login_days: string[];
  last_login_utc: string | null;
  text_requests: number;
  images: number;
  tracks: number;
  referrals: number;
  referral_code: string;
};

export type { WelcomeBonusProgress };

function asConfig(value: unknown): WelcomeBonusConfig {
  return parseWelcomeBonusConfig(value) ?? DEFAULT_WELCOME_BONUS_CONFIG;
}

function asUtcDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match?.[1] ?? null;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return utcDateString(value);
  return null;
}

function asUtcDates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asUtcDate(item as string | Date)).filter((item): item is string => Boolean(item));
}

function progressOf(row: CampaignRow, id: WelcomeBonusTaskId): number {
  if (id === "login") return asUtcDates(row.login_days).length;
  if (id === "texts") return row.text_requests;
  if (id === "images") return row.images;
  if (id === "tracks") return row.tracks;
  return row.referrals;
}

function toProgress(row: CampaignRow, origin: string, now = new Date()): WelcomeBonusProgress {
  const config = asConfig(row.config);
  const today = utcDateString(now);
  const active = !row.credited_at && now < new Date(row.ends_at);
  const tasks = (["login", "texts", "images", "tracks", "friends"] as const).map((id) => {
    const progress = Math.min(progressOf(row, id), config[id].required);
    const earned = taskEarnedTokens(config[id], progress);
    return { id, progress, required: config[id].required, maxBonus: config[id].maxBonus, earned, done: progress >= config[id].required };
  });
  const earned = tasks.reduce((sum, task) => sum + task.earned, 0);
  return {
    active,
    version: row.version,
    config,
    total: welcomeBonusTotal(config),
    earned,
    endsAt: new Date(row.ends_at).toISOString(),
    creditAt: welcomeBonusCreditAt(row.user_created_at ?? row.started_at),
    showTeaser: active && row.dismissed_on !== today,
    referralCode: row.referral_code,
    referralUrl: `${origin.replace(/\/$/, "")}/register?ref=${encodeURIComponent(row.referral_code)}`,
    credited: Boolean(row.credited_at),
    loginDays: asUtcDates(row.login_days),
    tasks,
  };
}

export async function getCurrentWelcomeBonusSettings(): Promise<{ version: number; config: WelcomeBonusConfig }> {
  const rows = await query<{ version: number; config: unknown }>("SELECT version, config FROM welcome_bonus_settings ORDER BY version DESC LIMIT 1");
  if (!rows[0]) return { version: 1, config: DEFAULT_WELCOME_BONUS_CONFIG };
  return { version: rows[0].version, config: asConfig(rows[0].config) };
}

export async function saveWelcomeBonusSettings(config: WelcomeBonusConfig, adminEmail: string) {
  const current = await getCurrentWelcomeBonusSettings();
  const version = current.version + 1;
  await query("INSERT INTO welcome_bonus_settings(version, config, created_by) VALUES($1,$2,$3)", [version, config, adminEmail]);
  await query("INSERT INTO welcome_bonus_setting_logs(version, admin_email, changes) VALUES($1,$2,$3)", [version, adminEmail, { from: current.config, to: config }]);
  return { version, config };
}

export async function listWelcomeBonusLogs() {
  return query<{ version: number; admin_email: string; changes: unknown; created_at: Date }>(
    "SELECT version, admin_email, changes, created_at FROM welcome_bonus_setting_logs ORDER BY created_at DESC LIMIT 30",
  );
}

export async function startWelcomeBonusCampaign(client: PoolClient, userId: string) {
  const settings = await query<{ version: number; config: unknown }>("SELECT version, config FROM welcome_bonus_settings ORDER BY version DESC LIMIT 1");
  const version = settings[0]?.version ?? 1;
  const config = asConfig(settings[0]?.config);
  const code = randomBytes(5).toString("hex");
  await client.query(
    `INSERT INTO welcome_bonus_campaigns(user_id,version,config,ends_at,referral_code)
     SELECT $1,$2,$3, u.created_at + interval '6 days', $4
     FROM users u WHERE u.id=$1
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, version, config, code],
  );
}

async function loadCampaign(userId: string): Promise<CampaignRow | null> {
  const rows = await query<CampaignRow>(
    `SELECT c.*, u.created_at AS user_created_at
     FROM welcome_bonus_campaigns c
     JOIN users u ON u.id = c.user_id
     WHERE c.user_id=$1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function ensureWelcomeBonusCampaign(userId: string) {
  const settings = await getCurrentWelcomeBonusSettings();
  const code = randomBytes(5).toString("hex");
  await query(
    `INSERT INTO welcome_bonus_campaigns(user_id,version,config,ends_at,referral_code)
     SELECT $1,$2,$3, u.created_at + interval '6 days', $4
     FROM users u WHERE u.id=$1
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, settings.version, settings.config, code],
  );
  await query(
    `UPDATE welcome_bonus_campaigns c
     SET ends_at = u.created_at + interval '6 days'
     FROM users u
     WHERE u.id = c.user_id AND c.user_id = $1 AND c.credited_at IS NULL`,
    [userId],
  );
}

export async function syncWelcomeBonusActivity(userId: string) {
  await query(
    `UPDATE welcome_bonus_campaigns c SET
      text_requests = GREATEST(
        c.text_requests,
        (SELECT count(*)::int FROM messages m JOIN conversations conv ON conv.id=m.conversation_id WHERE conv.user_id=c.user_id AND m.role='user'),
        (SELECT count(*)::int FROM conversations conv WHERE conv.user_id=c.user_id)
      ),
      images = GREATEST(
        c.images,
        (SELECT count(*)::int FROM image_generations g WHERE g.user_id=c.user_id),
        (SELECT count(*)::int FROM image_conversations ic WHERE ic.user_id=c.user_id)
      )
     WHERE c.user_id=$1 AND c.credited_at IS NULL`,
    [userId],
  );
}

export async function getWelcomeBonusProgress(userId: string, origin: string, options?: { sync?: boolean }): Promise<WelcomeBonusProgress | null> {
  if (options?.sync !== false) {
    await ensureWelcomeBonusCampaign(userId);
    await syncWelcomeBonusActivity(userId);
  }
  const row = await loadCampaign(userId);
  return row ? toProgress(row, origin) : null;
}

export async function creditDueWelcomeBonusForUser(userId: string, note: string) {
  const due = await query<CampaignRow>("SELECT user_id FROM welcome_bonus_campaigns WHERE user_id=$1 AND credited_at IS NULL AND now() >= ends_at", [userId]);
  if (!due[0]) return;
  await creditDueWelcomeBonuses(note, userId);
}

export async function dismissWelcomeBonusTeaser(userId: string) {
  await query("UPDATE welcome_bonus_campaigns SET dismissed_on=$2::date WHERE user_id=$1 AND credited_at IS NULL AND now() < ends_at", [userId, utcDateString()]);
}

export async function recordWelcomeBonusLogin(userId: string) {
  await ensureWelcomeBonusCampaign(userId);
  const today = utcDateString();
  const rows = await query<CampaignRow & { last_login_day: string | null }>(
    `SELECT *, to_char(last_login_utc, 'YYYY-MM-DD') AS last_login_day
     FROM welcome_bonus_campaigns
     WHERE user_id=$1 AND credited_at IS NULL AND now() < ends_at`,
    [userId],
  );
  const row = rows[0];
  if (!row) return;
  const days = nextLoginDays(asUtcDates(row.login_days), row.last_login_day ?? asUtcDate(row.last_login_utc), today, asConfig(row.config).login.required);
  if (!days) return;
  await query(
    `UPDATE welcome_bonus_campaigns
     SET login_days=$2, last_login_utc=$3::date
     WHERE user_id=$1 AND credited_at IS NULL AND now() < ends_at
       AND last_login_utc IS DISTINCT FROM $3::date
       AND NOT ($3 = ANY(login_days))`,
    [userId, days, today],
  );
}

export async function incrementWelcomeBonus(userId: string, task: Exclude<WelcomeBonusTaskId, "login" | "friends">) {
  const column = task === "texts" ? "text_requests" : task;
  const sql = `UPDATE welcome_bonus_campaigns SET ${column} = ${column} + 1
     WHERE user_id=$1 AND credited_at IS NULL AND now() < ends_at`;
  const updated = await getPool().query(sql, [userId]);
  if ((updated.rowCount ?? 0) > 0) return;
  await ensureWelcomeBonusCampaign(userId);
  await getPool().query(sql, [userId]);
}

export async function rememberReferralVisit(code: string, visitorKey: string) {
  if (!code || !visitorKey) return;
  const rows = await query<{ user_id: string }>("SELECT user_id FROM welcome_bonus_campaigns WHERE referral_code=$1 AND credited_at IS NULL AND now() < ends_at", [code]);
  if (!rows[0]) return;
  await query(
    `INSERT INTO welcome_bonus_referrals(referrer_id, visitor_key, expires_at)
     VALUES($1,$2,now() + interval '10 days')
     ON CONFLICT (referrer_id, visitor_key) DO NOTHING`,
    [rows[0].user_id, visitorKey.slice(0, 80)],
  );
}

export async function attachReferralSignup(client: PoolClient, invitedUserId: string, visitorKey: string | null, code: string | null) {
  const referral = await client.query<{ referrer_id: string }>(
    `SELECT r.referrer_id FROM welcome_bonus_referrals r
     JOIN welcome_bonus_campaigns c ON c.user_id=r.referrer_id
     WHERE r.invited_user_id IS NULL AND r.expires_at > now() AND c.credited_at IS NULL AND now() < c.ends_at
       AND (r.visitor_key=$1 OR c.referral_code=$2)
     ORDER BY r.created_at DESC LIMIT 1`,
    [visitorKey ?? "", code ?? ""],
  );
  const referrerId = referral.rows[0]?.referrer_id;
  if (!referrerId || referrerId === invitedUserId) return;
  await client.query("UPDATE welcome_bonus_referrals SET invited_user_id=$2 WHERE referrer_id=$1 AND invited_user_id IS NULL AND expires_at > now()", [referrerId, invitedUserId]);
  await client.query("UPDATE welcome_bonus_campaigns SET referrals = referrals + 1 WHERE user_id=$1 AND credited_at IS NULL AND now() < ends_at", [referrerId]);
}

export async function creditDueWelcomeBonuses(note: string, userId?: string) {
  const due = userId
    ? await query<CampaignRow>("SELECT user_id FROM welcome_bonus_campaigns WHERE user_id=$1 AND credited_at IS NULL AND now() >= ends_at", [userId])
    : await query<CampaignRow>("SELECT user_id FROM welcome_bonus_campaigns WHERE credited_at IS NULL AND now() >= ends_at");
  let credited = 0;
  for (const row of due) {
    await syncWelcomeBonusActivity(row.user_id);
    const fresh = await loadCampaign(row.user_id);
    if (!fresh) continue;
    const progress = toProgress(fresh, "");
    if (progress.earned <= 0) {
      await query("UPDATE welcome_bonus_campaigns SET credited_at=now() WHERE user_id=$1", [row.user_id]);
      continue;
    }
    await query("UPDATE users SET balance_tokens = balance_tokens + $2, updated_at=now() WHERE id=$1", [row.user_id, progress.earned]);
    await query("INSERT INTO balance_transactions(user_id,kind,token_delta,note) VALUES($1,'bonus',$2,$3)", [row.user_id, progress.earned, note]);
    await query("UPDATE welcome_bonus_campaigns SET credited_at=now() WHERE user_id=$1", [row.user_id]);
    credited += 1;
  }
  return credited;
}
