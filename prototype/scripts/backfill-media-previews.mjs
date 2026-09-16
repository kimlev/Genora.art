import pg from "pg";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString });
await client.connect();

const execFileAsync = promisify(execFile);

async function resizeWebp(bytes, width, quality) {
  const directory = await mkdtemp(join(tmpdir(), "genora-backfill-"));
  const inputPath = join(directory, "input");
  const outputPath = join(directory, "output.webp");
  try {
    await writeFile(inputPath, bytes);
    await execFileAsync(
      "vipsthumbnail",
      [
        inputPath,
        "--size",
        `${width}x${width}`,
        "--path",
        `${outputPath}[Q=${quality},strip]`,
        "--vips-concurrency=2",
        "--vips-cache-max-memory=67108864",
        "--vips-max-coord=9000",
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    const output = await readFile(outputPath);
    if (!output.length) throw new Error("Empty image preview");
    return output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function createVideoPreview(bytes) {
  const directory = await mkdtemp(join(tmpdir(), "genora-video-backfill-"));
  const inputPath = join(directory, "input-video");
  const outputPath = join(directory, "preview.webp");
  try {
    await writeFile(inputPath, bytes);
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-ss",
        "0",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:640:force_original_aspect_ratio=decrease",
        "-c:v",
        "libwebp",
        "-quality",
        "75",
        "-compression_level",
        "4",
        "-threads",
        "2",
        "-map_metadata",
        "-1",
        "-y",
        outputPath,
      ],
      { timeout: 45_000, maxBuffer: 1024 * 1024 },
    );
    const output = await readFile(outputPath);
    if (!output.length) throw new Error("Empty video preview");
    return output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

let optimized = 0;
let videoPreviews = 0;
let skipped = 0;
let musicCovers = 0;
let agentCovers = 0;
try {
  while (true) {
    const result = await client.query(
      `SELECT id,mime,bytes
       FROM media_assets
       WHERE kind='image' AND preview_byte_length IS NULL
       ORDER BY created_at ASC
       LIMIT 25`,
    );
    if (!result.rowCount) break;
    for (const row of result.rows) {
      try {
        const preview = await resizeWebp(row.bytes, 640, 78);
        await client.query(
          "UPDATE media_assets SET preview_mime='image/webp',preview_bytes=$2,preview_byte_length=$3 WHERE id=$1",
          [row.id, preview, preview.byteLength],
        );
        optimized += 1;
      } catch {
        await client.query("UPDATE media_assets SET preview_byte_length=0 WHERE id=$1", [row.id]);
        skipped += 1;
      }
    }
  }

  while (true) {
    const result = await client.query(
      `SELECT id,bytes
       FROM media_assets
       WHERE kind='video' AND preview_byte_length IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
    );
    if (!result.rowCount) break;
    for (const row of result.rows) {
      try {
        const preview = await createVideoPreview(row.bytes);
        await client.query(
          "UPDATE media_assets SET preview_mime='image/webp',preview_bytes=$2,preview_byte_length=$3 WHERE id=$1",
          [row.id, preview, preview.byteLength],
        );
        videoPreviews += 1;
      } catch {
        await client.query("UPDATE media_assets SET preview_byte_length=0 WHERE id=$1", [row.id]);
        skipped += 1;
      }
    }
  }

  const covers = await client.query(
    "SELECT id,cover_upload FROM music_tracks WHERE cover_upload IS NOT NULL AND cover_preview IS NULL",
  );
  for (const row of covers.rows) {
    try {
      const preview = await resizeWebp(row.cover_upload, 640, 78);
      await client.query(
        "UPDATE music_tracks SET cover_preview=$2,cover_preview_mime='image/webp' WHERE id=$1",
        [row.id, preview],
      );
      musicCovers += 1;
    } catch {
      skipped += 1;
    }
  }

  const agents = await client.query("SELECT id,cover_url FROM system_agent_overrides WHERE cover_url LIKE 'data:image/%'");
  for (const row of agents.rows) {
    const match = /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/=]+)$/i.exec(row.cover_url);
    if (!match) {
      skipped += 1;
      continue;
    }
    try {
      const original = await resizeWebp(Buffer.from(match[2], "base64"), 1280, 82);
      const preview = await resizeWebp(original, 640, 78);
      const mediaId = `agent-cover-${createHash("sha256").update(row.id).digest("hex").slice(0, 32)}`;
      await client.query(
        `INSERT INTO media_assets(id,kind,mime,bytes,byte_length,preview_mime,preview_bytes,preview_byte_length)
         VALUES($1,'image','image/webp',$2,$3,'image/webp',$4,$5)
         ON CONFLICT (id) DO UPDATE SET mime=EXCLUDED.mime,bytes=EXCLUDED.bytes,byte_length=EXCLUDED.byte_length,preview_mime=EXCLUDED.preview_mime,preview_bytes=EXCLUDED.preview_bytes,preview_byte_length=EXCLUDED.preview_byte_length`,
        [mediaId, original, original.byteLength, preview, preview.byteLength],
      );
      await client.query("UPDATE system_agent_overrides SET cover_url=$2,updated_at=now() WHERE id=$1", [row.id, `/api/agents/assets/${mediaId}`]);
      agentCovers += 1;
    } catch {
      skipped += 1;
    }
  }

  console.log(JSON.stringify({ optimized, videoPreviews, musicCovers, agentCovers, skipped }));
} finally {
  await client.end();
}
