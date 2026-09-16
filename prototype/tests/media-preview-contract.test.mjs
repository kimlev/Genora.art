import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { storeMediaAsset, loadMediaAsset, keepMediaLocal, serveMediaAsset } from "../src/lib/server/media-assets.ts";
import { readFile } from "node:fs/promises";

test("preview is mandatory before readiness, original survives failure, GET never encodes", async () => {
  const records = new Map();
  const calls = [];
  const previous = globalThis.genoraPool;
  globalThis.genoraPool = { query: async (sql, args) => {
    calls.push(sql);
    const row = records.get(args[0]);
    if (sql.includes("INSERT INTO media_assets")) {
      const [id, kind, mime, bytes, byte_length, preview_mime, preview_bytes, preview_byte_length] = args;
      records.set(id, { kind, mime, bytes, byte_length, preview_mime, preview_bytes, preview_byte_length });
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE")) {
      Object.assign(row, { preview_mime: args[1], preview_bytes: args[2], preview_byte_length: args[3] });
      return { rows: [] };
    }
    return { rows: sql.includes("SELECT EXISTS") ? [{ exists: Boolean(row) }] : row ? [row] : [] };
  } };
  try {
    const bytes = await sharp({ create: { width: 900, height: 600, channels: 3, background: "blue" } }).png().toBuffer();
    await storeMediaAsset("good", "image", "image/png", bytes);
    assert.ok(records.get("good").preview_byte_length > 0);
    const before = calls.length;
    assert.equal((await loadMediaAsset("good", "preview")).mime, "image/webp");
    assert.equal(calls.length - before, 1);
    await assert.rejects(storeMediaAsset("bad", "image", "image/png", Buffer.from("invalid")), /MEDIA_PREVIEW_FAILED/);
    assert.equal(records.get("bad").bytes.toString(), "invalid", "paid original retained");
    const failedReadStart = calls.length;
    await assert.rejects(serveMediaAsset("image", "bad", "preview"), /MEDIA_PREVIEW_NOT_READY/);
    assert.equal(calls.length - failedReadStart, 1, "GET only checks the preview, no original read or update");
    records.get("good").preview_bytes = null;
    await Promise.all([keepMediaLocal("image", ["good"]), keepMediaLocal("image", ["good"])]);
    assert.ok(records.get("good").preview_bytes.length > 0, "recovery prepares preview before returning ready");
    await storeMediaAsset("audio", "music", "audio/mpeg", Buffer.from("audio"));
    assert.equal((await loadMediaAsset("audio")).mime, "audio/mpeg");
  } finally { globalThis.genoraPool = previous; }
});

test("media jobs persist verified local files before acknowledging success", async () => {
  for (const path of ["../src/lib/server/image-jobs.ts", "../src/lib/server/video-jobs.ts", "../src/lib/server/music-jobs.ts"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const local = source.indexOf("await keepMediaLocal");
    const acknowledged = source.indexOf("await ackAfterPersist", local);
    assert.ok(local >= 0, `${path} downloads media locally`);
    assert.ok(acknowledged > local, `${path} acknowledges only after local persistence`);
  }
});

test("text jobs persist the answer before acknowledging success", async () => {
  const source = await readFile(new URL("../src/lib/server/chat-jobs.ts", import.meta.url), "utf8");
  const message = source.indexOf("INSERT INTO messages");
  const ready = source.indexOf("UPDATE generation_jobs SET status='ready'", message);
  const acknowledged = source.indexOf("await ackAfterPersist", ready);
  assert.ok(message >= 0 && ready > message && acknowledged > ready);
});
