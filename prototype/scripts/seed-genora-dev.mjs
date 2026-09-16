import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import pg from "pg";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "true") {
  throw new Error("Dev seed is disabled in production");
}

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(32).toString("base64url");
if (!connectionString || !adminEmail) throw new Error("DATABASE_URL and ADMIN_EMAIL are required");

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  const passwordHash = await hash(adminPassword, 12);
  await client.query(`INSERT INTO administrators(email,password_hash,name,nickname,timezone,active,password_set_at)
    VALUES($1,$2,'Genora Support','Support','Europe/Minsk',true,now())
    ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,nickname=EXCLUDED.nickname,
    timezone=EXCLUDED.timezone,active=true,password_set_at=now(),updated_at=now()`, [adminEmail, passwordHash]);
  await client.query("COMMIT");
  console.log("Genora dev seed applied: 1 administrator, no users or client data");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
