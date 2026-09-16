import "server-only";

import { query } from "@/lib/server/db";
import {
  DEFAULT_REGISTRATION_BONUS_THOUSANDS,
  parseRegistrationBonusThousands,
  registrationBonusTokensFromThousands,
} from "@/lib/site-settings";

export async function getRegistrationBonusThousands(): Promise<number> {
  const rows = await query<{ value_int: number }>(
    "SELECT value_int FROM site_settings WHERE key='registration_bonus_thousands'",
  );
  return parseRegistrationBonusThousands(Number(rows[0]?.value_int)) ?? DEFAULT_REGISTRATION_BONUS_THOUSANDS;
}

export async function getRegistrationBonusTokens(): Promise<number> {
  return registrationBonusTokensFromThousands(await getRegistrationBonusThousands());
}

export async function setRegistrationBonusThousands(thousands: number): Promise<number> {
  const parsed = parseRegistrationBonusThousands(thousands);
  if (parsed === null) throw new Error("INVALID_REGISTRATION_BONUS");
  await query(`INSERT INTO site_settings(key,value_int,updated_at) VALUES('registration_bonus_thousands',$1,now())
    ON CONFLICT (key) DO UPDATE SET value_int=excluded.value_int, updated_at=now()`, [parsed]);
  return parsed;
}
