import "server-only";

import { createHash } from "node:crypto";

export function appSecret(): string {
  const configured = process.env.PREVIEW_COOKIE_SECRET?.trim()
    || process.env.SUPPORT_WORKER_SECRET?.trim()
    || process.env.BLOGORO_WEBHOOK_SECRET?.trim();
  if (configured) return configured;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return createHash("sha256").update(databaseUrl).digest("hex");
  return "genora-dev-secret";
}
