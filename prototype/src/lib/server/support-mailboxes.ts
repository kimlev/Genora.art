import "server-only";

import { query, withTransaction } from "@/lib/server/db";
import { decryptSecret, encryptSecret } from "@/lib/server/totp";
import { isValidEmail, normalizeEmail } from "@/lib/server/http";
import { envImapAccount, verifyImapAccount, type ImapAccount } from "@/lib/server/imap-inbox";
import { supportMailProvider, type SupportMailProviderId } from "@/lib/support-mail-providers";
import { DEFAULT_PUBLIC_EMAIL } from "@/lib/public-contact";

const MAILBOX_COLUMNS = "id,email,provider,app_password_encrypted,enabled,last_uid,uid_validity,last_organized_on,last_error,is_primary,is_auth";

export type SupportMailboxRow = {
  id: string;
  email: string;
  provider: string;
  app_password_encrypted: string;
  enabled: boolean;
  last_uid: string | number;
  uid_validity: string | null;
  last_organized_on: string | Date | null;
  last_error: string | null;
  is_primary: boolean;
  is_auth: boolean;
};

export type PublicMailbox = {
  id: string;
  email: string;
  provider: SupportMailProviderId;
  providerLabel: string;
  enabled: boolean;
  lastError: string | null;
  isPrimary: boolean;
  isAuth: boolean;
};

function publicMailbox(row: SupportMailboxRow): PublicMailbox {
  const provider = supportMailProvider(row.provider);
  return {
    id: row.id,
    email: row.email,
    provider: (provider?.id ?? "privateemail") as SupportMailProviderId,
    providerLabel: provider?.label ?? row.provider,
    enabled: row.enabled,
    lastError: row.last_error,
    isPrimary: Boolean(row.is_primary),
    isAuth: Boolean(row.is_auth),
  };
}

export function mailboxImapAccount(row: SupportMailboxRow): ImapAccount {
  const provider = supportMailProvider(row.provider);
  if (!provider) throw new Error("MAIL_PROVIDER_UNKNOWN");
  return {
    user: row.email,
    pass: decryptSecret(row.app_password_encrypted),
    host: provider.host,
    port: provider.port,
    secure: provider.secure,
  };
}

export async function listSupportMailboxes(): Promise<PublicMailbox[]> {
  await ensureEnvMailbox();
  const rows = await query<SupportMailboxRow>(`SELECT ${MAILBOX_COLUMNS}
    FROM support_mailboxes ORDER BY created_at,email`);
  return rows.map(publicMailbox);
}

export async function listEnabledMailboxRows(): Promise<SupportMailboxRow[]> {
  await ensureEnvMailbox();
  return query<SupportMailboxRow>(`SELECT ${MAILBOX_COLUMNS}
    FROM support_mailboxes WHERE enabled=true ORDER BY created_at,email`);
}

export async function getMailboxRow(id: string): Promise<SupportMailboxRow | null> {
  const rows = await query<SupportMailboxRow>(`SELECT ${MAILBOX_COLUMNS}
    FROM support_mailboxes WHERE id=$1`, [id]);
  return rows[0] ?? null;
}

export async function getPrimarySupportEmail(): Promise<string> {
  const rows = await query<{ email: string }>(`SELECT email FROM support_mailboxes WHERE is_primary=true AND enabled=true LIMIT 1`);
  return rows[0]?.email || DEFAULT_PUBLIC_EMAIL;
}

export async function getAuthMailboxEmail(): Promise<string> {
  const rows = await query<{ email: string }>(`SELECT email FROM support_mailboxes WHERE is_auth=true AND enabled=true LIMIT 1`);
  return rows[0]?.email || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || DEFAULT_PUBLIC_EMAIL;
}

async function assignExclusiveFlag(id: string, column: "is_primary" | "is_auth", enabled: boolean) {
  await withTransaction(async (client) => {
    if (enabled) {
      await client.query(`UPDATE support_mailboxes SET ${column}=false WHERE id<>$1 AND ${column}=true`, [id]);
      await client.query(`UPDATE support_mailboxes SET ${column}=true, updated_at=now() WHERE id=$1`, [id]);
      return;
    }
    await client.query(`UPDATE support_mailboxes SET ${column}=false, updated_at=now() WHERE id=$1`, [id]);
  });
}

export async function mailboxEmails(): Promise<string[]> {
  const rows = await query<{ email: string }>("SELECT email FROM support_mailboxes WHERE enabled=true");
  return rows.map((row) => row.email);
}

async function ensureEnvMailbox() {
  const env = envImapAccount();
  if (!env) return;
  const email = normalizeEmail(env.user);
  if (!isValidEmail(email)) return;
  const existing = await query<{ id: string }>("SELECT id FROM support_mailboxes WHERE lower(email)=$1", [email]);
  if (existing[0]) {
    await query("UPDATE support_requests SET inbox_email=$1 WHERE channel='email' AND inbox_email IS NULL", [email]);
    return;
  }
  const state = await query<{ last_uid: string | number; uid_validity: string | null; last_organized_on: string | Date | null; last_error: string | null }>(
    "SELECT last_uid,uid_validity,last_organized_on,last_error FROM support_mail_state WHERE id=1",
  );
  const inherited = state[0];
  const created = await query<{ id: string }>(`INSERT INTO support_mailboxes(email,provider,app_password_encrypted,enabled,last_uid,uid_validity,last_organized_on,last_error)
    VALUES($1,'privateemail',$2,true,COALESCE($3,0),$4,$5,$6) RETURNING id`,
  [
    email,
    encryptSecret(env.pass),
    inherited ? Number(inherited.last_uid) || 0 : 0,
    inherited?.uid_validity ?? null,
    inherited?.last_organized_on ?? null,
    inherited?.last_error ?? null,
  ]);
  if (created[0]) {
    await assignExclusiveFlag(created[0].id, "is_primary", true);
    await assignExclusiveFlag(created[0].id, "is_auth", true);
  }
  await query("UPDATE support_requests SET inbox_email=$1 WHERE channel='email' AND inbox_email IS NULL", [email]);
}

export async function saveSupportMailbox(input: {
  id?: string;
  email: string;
  provider: string;
  appPassword?: string;
  isPrimary?: boolean;
  isAuth?: boolean;
}): Promise<PublicMailbox> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("MAIL_EMAIL_INVALID");
  const provider = supportMailProvider(input.provider);
  if (!provider) throw new Error("MAIL_PROVIDER_UNKNOWN");

  let password = input.appPassword?.trim() ?? "";
  let existing: SupportMailboxRow | null = null;
  if (input.id) {
    existing = await getMailboxRow(input.id);
    if (!existing) throw new Error("MAIL_NOT_FOUND");
    if (!password) password = decryptSecret(existing.app_password_encrypted);
  }
  if (!password) throw new Error("MAIL_PASSWORD_REQUIRED");

  const account: ImapAccount = { user: email, pass: password, host: provider.host, port: provider.port, secure: provider.secure };
  try {
    await verifyImapAccount(account);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "IMAP_AUTH_FAILED") throw new Error("MAIL_PASSWORD_INVALID");
    throw new Error("MAIL_CONNECT_FAILED");
  }

  const encrypted = encryptSecret(password);
  let saved: SupportMailboxRow | undefined;
  if (existing) {
    const rows = await query<SupportMailboxRow>(`UPDATE support_mailboxes
      SET email=$2,provider=$3,app_password_encrypted=$4,enabled=true,last_error=NULL,updated_at=now()
      WHERE id=$1
      RETURNING ${MAILBOX_COLUMNS}`,
    [existing.id, email, provider.id, encrypted]);
    saved = rows[0];
  } else {
    try {
      const rows = await query<SupportMailboxRow>(`INSERT INTO support_mailboxes(email,provider,app_password_encrypted,enabled)
        VALUES($1,$2,$3,true)
        RETURNING ${MAILBOX_COLUMNS}`,
      [email, provider.id, encrypted]);
      saved = rows[0];
    } catch (error) {
      const duplicate = error instanceof Error && /support_mailboxes_email_idx|unique/i.test(error.message);
      if (duplicate) throw new Error("MAIL_ALREADY_EXISTS");
      throw error;
    }
  }
  if (!saved) throw new Error("MAIL_NOT_FOUND");
  if (input.isPrimary !== undefined) await assignExclusiveFlag(saved.id, "is_primary", input.isPrimary);
  if (input.isAuth !== undefined) await assignExclusiveFlag(saved.id, "is_auth", input.isAuth);
  const latest = await getMailboxRow(saved.id);
  return publicMailbox(latest ?? saved);
}

export async function deleteSupportMailbox(id: string): Promise<void> {
  const deleted = await query<{ id: string }>("DELETE FROM support_mailboxes WHERE id=$1 RETURNING id", [id]);
  if (!deleted[0]) throw new Error("MAIL_NOT_FOUND");
}

export async function saveMailboxSyncState(id: string, patch: { lastUid?: number; uidValidity?: string | null; lastOrganizedOn?: string; lastError?: string | null }) {
  await query(`UPDATE support_mailboxes SET
    last_uid=COALESCE($2,last_uid),
    uid_validity=COALESCE($3,uid_validity),
    last_organized_on=COALESCE($4::date,last_organized_on),
    last_error=$5,
    updated_at=now()
    WHERE id=$1`,
  [id, patch.lastUid ?? null, patch.uidValidity ?? null, patch.lastOrganizedOn ?? null, patch.lastError ?? null]);
}
