import "server-only";

import { createHash } from "node:crypto";
import { query } from "./db";

function opaqueKey(scope: string, identifier: string): string {
  return `${scope}:${createHash("sha256").update(identifier).digest("hex")}`;
}

export async function consumeRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  const rows = await query<{ attempts: number }>(`INSERT INTO auth_rate_limits(bucket_key,window_started_at,attempts)
    VALUES($1,now(),1)
    ON CONFLICT(bucket_key) DO UPDATE SET
      window_started_at=CASE WHEN auth_rate_limits.window_started_at < now()-($2::int*interval '1 second') THEN now() ELSE auth_rate_limits.window_started_at END,
      attempts=CASE WHEN auth_rate_limits.window_started_at < now()-($2::int*interval '1 second') THEN 1 ELSE auth_rate_limits.attempts+1 END,
      updated_at=now()
    RETURNING attempts`, [opaqueKey(input.scope, input.identifier), input.windowSeconds]);
  return (rows[0]?.attempts ?? input.limit + 1) <= input.limit;
}
