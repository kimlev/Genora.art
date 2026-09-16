import "server-only";

import { ImapFlow, type FetchMessageObject } from "imapflow";
import { extractEmailBodies } from "@/lib/email-mime";
import { brandFolderName, senderFolderName } from "@/lib/support-policy";

export type InboxMessage = {
  uid: number;
  from: string;
  subject: string;
  messageId: string;
  date: Date | null;
  text: string;
  html: string;
  headers: Record<string, string | undefined>;
};

export type ImapAccount = {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
};

export function envImapAccount(): ImapAccount | null {
  const user = process.env.IMAP_USER?.trim() || process.env.SMTP_USER?.trim();
  const pass = process.env.IMAP_PASSWORD?.trim() || process.env.SMTP_PASSWORD?.trim();
  const host = process.env.IMAP_HOST?.trim() || process.env.SMTP_HOST?.trim() || "mail.privateemail.com";
  if (!user || !pass || !host) return null;
  const port = Number(process.env.IMAP_PORT ?? 993);
  const secure = process.env.IMAP_SECURE ? process.env.IMAP_SECURE === "true" : port === 993;
  return { user, pass, host, port, secure };
}

function imapClientConfig(account: ImapAccount) {
  return {
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.user, pass: account.pass },
    logger: false as const,
    disableAutoIdle: true,
    socketTimeout: 30_000,
    greetingTimeout: 15_000,
  };
}

export function isImapConfigured(): boolean {
  return envImapAccount() !== null;
}

function imapErrorCode(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/auth|login|credentials|invalid user/i.test(text)) return "IMAP_AUTH_FAILED";
  return error instanceof Error ? error.message.slice(0, 180) : "IMAP_CONNECT_FAILED";
}

function parseHeaderBuffer(value?: Buffer): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  if (!value) return headers;
  for (const line of value.toString("utf8").split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function toInboxMessage(message: FetchMessageObject): InboxMessage {
  const from = message.envelope?.from?.[0]?.address ?? "";
  const messageId = String(message.envelope?.messageId ?? `uid-${message.uid}`).replace(/^<|>$/g, "");
  const bodies = extractEmailBodies(message.source);
  return {
    uid: message.uid,
    from,
    subject: message.envelope?.subject ?? "",
    messageId,
    date: message.envelope?.date ?? null,
    text: bodies.text,
    html: bodies.html,
    headers: parseHeaderBuffer(message.headers),
  };
}

export async function withImap<T>(account: ImapAccount, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow(imapClientConfig(account));
  try {
    await client.connect();
  } catch (error) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    throw new Error(imapErrorCode(error));
  }
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

export async function verifyImapAccount(account: ImapAccount): Promise<void> {
  await withImap(account, async (client) => {
    await client.getMailboxLock("INBOX").then((lock) => lock.release());
  });
}

export async function fetchAllInboxMessages(client: ImapFlow) {
  return fetchNewInboxMessages(client, 0, null);
}

export async function fetchNewInboxMessages(client: ImapFlow, lastUid: number, uidValidity: string | null) {
  const lock = await client.getMailboxLock("INBOX");
  try {
    const mailbox = client.mailbox;
    if (!mailbox) throw new Error("INBOX_NOT_OPEN");
    const currentValidity = String(mailbox.uidValidity ?? "");
    const reset = Boolean(uidValidity && currentValidity && uidValidity !== currentValidity);
    const uidNext = Number(mailbox.uidNext ?? 1);
    const sinceUid = reset || lastUid < 1 ? 1 : lastUid + 1;
    if (sinceUid >= uidNext) {
      return { uidValidity: currentValidity, lastUid: Math.max(lastUid, uidNext - 1), messages: [] as InboxMessage[] };
    }
    const messages: InboxMessage[] = [];
    for await (const message of client.fetch(`${sinceUid}:*`, {
      uid: true,
      envelope: true,
      source: true,
      headers: ["list-unsubscribe", "list-id", "auto-submitted", "precedence"],
    }, { uid: true })) {
      messages.push(toInboxMessage(message));
    }
    const maxUid = messages.reduce((max, item) => Math.max(max, item.uid), reset ? 0 : lastUid);
    return { uidValidity: currentValidity, lastUid: maxUid || lastUid, messages };
  } finally {
    lock.release();
  }
}

export async function listInboxSenders(client: ImapFlow) {
  const lock = await client.getMailboxLock("INBOX");
  try {
    const grouped = new Map<string, number[]>();
    const mailbox = client.mailbox;
    if (!mailbox) return grouped;
    for await (const message of client.fetch("1:*", { uid: true, envelope: true }, { uid: true })) {
      const from = (message.envelope?.from?.[0]?.address ?? "").toLowerCase();
      if (!from) continue;
      const uids = grouped.get(from) ?? [];
      uids.push(message.uid);
      grouped.set(from, uids);
    }
    return grouped;
  } finally {
    lock.release();
  }
}

export async function ensureSenderMailbox(client: ImapFlow, email: string): Promise<{ folderName: string; folderPath: string }> {
  return ensureBrandMailbox(client, senderFolderName(email));
}

export async function ensureBrandMailbox(client: ImapFlow, brand: string): Promise<{ folderName: string; folderPath: string }> {
  const folderName = brand.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 70) || "Other";
  const folderPath = `INBOX/Brands/${folderName}`;
  try {
    await client.mailboxCreate("INBOX/Brands");
  } catch {
    /* already exists */
  }
  try {
    await client.mailboxCreate(folderPath);
  } catch {
    /* already exists */
  }
  return { folderName, folderPath };
}

export async function moveMessagesToFolder(client: ImapFlow, uids: number[], folderPath: string, source = "INBOX") {
  if (!uids.length) return;
  const lock = await client.getMailboxLock(source);
  try {
    await client.messageMove(uids, folderPath, { uid: true });
  } finally {
    lock.release();
  }
}

export async function restoreSenderFoldersToInbox(client: ImapFlow): Promise<number> {
  const boxes = await client.list();
  let moved = 0;
  for (const box of boxes) {
    if (!box.path.startsWith("INBOX/Senders/") || box.path === "INBOX/Senders") continue;
    const lock = await client.getMailboxLock(box.path);
    try {
      const mailbox = client.mailbox;
      if (!mailbox || Number(mailbox.exists ?? 0) < 1) continue;
      const uids: number[] = [];
      for await (const message of client.fetch("1:*", { uid: true }, { uid: true })) uids.push(message.uid);
      if (uids.length) {
        await client.messageMove(uids, "INBOX", { uid: true });
        moved += uids.length;
      }
    } finally {
      lock.release();
    }
  }
  return moved;
}

export function folderBrandForEmail(email: string): string | null {
  return brandFolderName(email);
}
