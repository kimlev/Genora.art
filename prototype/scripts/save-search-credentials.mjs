/**
 * Записывает доступы поисковых консолей в таблицу search_credentials.
 * Значения приходят в JSON через стандартный ввод, чтобы длинный ключ
 * с переводами строк не пришлось экранировать в командной строке:
 *
 *   docker exec -i genora-app node scripts/save-search-credentials.mjs < creds.json
 */
import pg from "pg";

const ALLOWED = new Set([
  "yandex_access_token",
  "yandex_refresh_token",
  "yandex_expires_at",
  "yandex_client_id",
  "yandex_client_secret",
  "yandex_host_id",
  "google_client_email",
  "google_private_key",
  "google_site",
]);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));

const unknown = Object.keys(payload).filter((name) => !ALLOWED.has(name));
if (unknown.length) throw new Error(`Unknown credentials: ${unknown.join(", ")}`);

const client = new pg.Client({ connectionString });
await client.connect();
try {
  for (const [name, value] of Object.entries(payload)) {
    if (typeof value !== "string" || !value.trim()) continue;
    await client.query(
      `INSERT INTO search_credentials(name, value) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET value = excluded.value, updated_at = now()`,
      [name, value.trim()],
    );
    console.log(`Saved ${name}`);
  }
} finally {
  await client.end();
}
