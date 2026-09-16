import "server-only";

import { query } from "@/lib/server/db";
import { createGalleryPreview, createVideoPreview } from "@/lib/server/image-optimization";
import { integratorImageAsset, integratorMusicAsset, integratorVideoAsset } from "@/lib/server/integrator";

export type MediaKind = "image" | "video" | "music";

function asBuffer(value: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value, "binary");
}

export type MediaVariant = "original" | "preview";

async function createMediaPreview(kind: MediaKind, bytes: Buffer, mime: string) {
  if (kind === "image") return createGalleryPreview(bytes, mime);
  if (kind === "video") return createVideoPreview(bytes);
  return null;
}

// Encoding belongs to result preparation, never to a thumbnail GET.
let encodingQueue = Promise.resolve();
async function requiredMediaPreview(kind: MediaKind, bytes: Buffer, mime: string) {
  if (kind === "music") return null;
  const previous = encodingQueue;
  let release!: () => void;
  encodingQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const preview = await createMediaPreview(kind, bytes, mime);
      if (preview?.bytes.length) return preview;
    }
    return null;
  } finally { release(); }
}

const pendingPreviews = new Map<string, Promise<void>>();
async function ensureMediaPreview(id: string, kind: MediaKind): Promise<void> {
  if (kind === "music") return;
  const pending = pendingPreviews.get(id);
  if (pending) return pending;
  const task = (async () => {
    if (await loadMediaAsset(id, "preview")) return;
    const original = await loadMediaAsset(id);
    if (!original) throw new Error("MEDIA_EMPTY");
    const preview = await requiredMediaPreview(kind, original.bytes, original.mime);
    if (!preview) throw new Error("MEDIA_PREVIEW_FAILED");
    await query("UPDATE media_assets SET preview_mime=$2,preview_bytes=$3,preview_byte_length=$4 WHERE id=$1",
      [id, preview.mime, preview.bytes, preview.bytes.length]);
  })().finally(() => { pendingPreviews.delete(id); });
  pendingPreviews.set(id, task);
  return task;
}

async function mediaAssetExists(id: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM media_assets WHERE id=$1 AND byte_length > 0) exists",
    [id],
  );
  return Boolean(rows[0]?.exists);
}

export async function loadMediaAsset(id: string, variant: MediaVariant = "original"): Promise<{ bytes: Buffer; mime: string } | null> {
  if (variant === "original") {
    const rows = await query<{ bytes: Buffer | Uint8Array; mime: string }>("SELECT bytes,mime FROM media_assets WHERE id=$1", [id]);
    const row = rows[0];
    if (!row) return null;
    const bytes = asBuffer(row.bytes);
    return bytes.length ? { bytes, mime: row.mime } : null;
  }

  const previews = await query<{ kind: MediaKind; preview_bytes: Buffer | Uint8Array | null; preview_mime: string | null; preview_byte_length: number | null }>(
    "SELECT kind,preview_bytes,preview_mime,preview_byte_length FROM media_assets WHERE id=$1",
    [id],
  );
  const storedPreview = previews[0];
  if (!storedPreview) return null;
  if (storedPreview.preview_bytes && storedPreview.preview_mime) {
    const previewBytes = asBuffer(storedPreview.preview_bytes);
    if (previewBytes.length) return { bytes: previewBytes, mime: storedPreview.preview_mime };
  }
  return null;
}

export async function storeMediaAsset(id: string, kind: MediaKind, mime: string, bytes: Buffer): Promise<void> {
  if (!bytes.length) throw new Error("MEDIA_EMPTY");
  const preview = await requiredMediaPreview(kind, bytes, mime);
  await query(
    `INSERT INTO media_assets(id,kind,mime,bytes,byte_length,preview_mime,preview_bytes,preview_byte_length)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       mime=EXCLUDED.mime,
       bytes=EXCLUDED.bytes,
       byte_length=EXCLUDED.byte_length,
       preview_mime=EXCLUDED.preview_mime,
       preview_bytes=EXCLUDED.preview_bytes,
       preview_byte_length=EXCLUDED.preview_byte_length`,
    [id, kind, mime, bytes, bytes.byteLength, preview?.mime ?? null, preview?.bytes ?? null, preview?.bytes.byteLength ?? 0],
  );
  // Keep the paid original recoverable even if encoding failed. Callers must not
  // publish/ACK the result until a retry has supplied the required preview.
  if (kind !== "music" && !preview) throw new Error("MEDIA_PREVIEW_FAILED");
}

async function pullIntegrator(kind: MediaKind, id: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  if (kind === "video") return integratorVideoAsset(id);
  if (kind === "music") return integratorMusicAsset(id);
  return integratorImageAsset(id);
}

export async function keepMediaLocal(kind: MediaKind, ids: string[]): Promise<void> {
  for (const id of ids) {
    if (await mediaAssetExists(id)) {
      await ensureMediaPreview(id, kind);
      continue;
    }
    const remote = await pullIntegrator(kind, id);
    const bytes = Buffer.from(remote.bytes);
    if (!bytes.length) throw Object.assign(new Error("MEDIA_EMPTY"), { statusCode: 404 });
    await storeMediaAsset(id, kind, remote.mime, bytes);
  }
}

export async function serveMediaAsset(kind: MediaKind, id: string, variant: MediaVariant = "original"): Promise<{ bytes: Buffer; mime: string }> {
  const local = await loadMediaAsset(id, variant);
  if (local?.bytes.length) return local;
  if (variant === "preview") throw Object.assign(new Error("MEDIA_PREVIEW_NOT_READY"), { statusCode: 503 });
  try {
    const remote = await pullIntegrator(kind, id);
    const bytes = Buffer.from(remote.bytes);
    if (!bytes.length) throw Object.assign(new Error("MEDIA_EMPTY"), { statusCode: 404 });
    await storeMediaAsset(id, kind, remote.mime, bytes);
    return { bytes, mime: remote.mime };
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error ? Number((error as { statusCode: number }).statusCode) : 0;
    if (status === 404 || (error instanceof Error && error.message === "MEDIA_EMPTY")) {
      throw Object.assign(new Error("MEDIA_GONE"), { statusCode: 404 });
    }
    throw error;
  }
}
