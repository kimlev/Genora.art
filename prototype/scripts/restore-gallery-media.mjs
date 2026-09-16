// Run in the app container. Default: read-only availability audit. --restore
// copies missing originals from the configured Integrator; then run backfill.
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const { rows } = await db.query(`WITH refs AS (
    SELECT 'image' kind,unnest(g.asset_ids) id,(g.deleted_at IS NOT NULL OR c.deleted_at IS NOT NULL) archived
      FROM image_generations g JOIN image_conversations c ON c.id=g.conversation_id
    UNION SELECT 'video' kind,unnest(g.asset_ids) id,(g.deleted_at IS NOT NULL OR c.deleted_at IS NOT NULL)
      FROM video_generations g JOIN image_conversations c ON c.id=g.conversation_id
  ) SELECT refs.kind,refs.id,bool_and(archived) archived FROM refs LEFT JOIN media_assets a USING(id)
    WHERE a.id IS NULL GROUP BY refs.kind,refs.id`);
  const counts = { missing: rows.length, available: 0, restored: 0, unavailable: {}, errors: 0 };
  for (const row of rows) {
    try {
      const route = row.kind === "video" ? "videos" : "images";
      const response = await fetch(`${process.env.INTEGRATOR_BASE_URL.replace(/\/$/, "")}/v1/${route}/${encodeURIComponent(row.id)}`, {
        headers: { authorization: `Bearer ${process.env.INTEGRATOR_API_KEY}` }, signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const reason = `${row.kind}:${row.archived ? "archive" : "active"}:${response.status}`;
        counts.unavailable[reason] = (counts.unavailable[reason] ?? 0) + 1;
        await response.body?.cancel();
        continue;
      }
      counts.available++;
      if (!process.argv.includes("--restore")) { await response.body?.cancel(); continue; }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) { counts.errors++; continue; }
      const mime = response.headers.get("content-type")?.split(";")[0] ?? (row.kind === "video" ? "video/mp4" : "image/png");
      await db.query(`INSERT INTO media_assets(id,kind,mime,bytes,byte_length)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`, [row.id,row.kind,mime,bytes,bytes.length]);
      counts.restored++;
    } catch { counts.errors++; }
  }
  console.log(JSON.stringify(counts));
} finally { await db.end(); }
