import { randomUUID } from "node:crypto";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { createAgentVideoLoopPreview, optimizeAgentCover } from "@/lib/server/image-optimization";
import { storeMediaAsset } from "@/lib/server/media-assets";

export const runtime = "nodejs";
export const maxDuration = 120;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const purpose = form.get("purpose") === "cover" ? "cover" : "reference";
    if (!(file instanceof File) || !file.size) return jsonError("Выберите файл");
    const mime = file.type.toLowerCase();
    const isImage = IMAGE_MIMES.has(mime);
    const isVideo = VIDEO_MIMES.has(mime);
    if (!isImage && !isVideo) return jsonError("Поддерживаются изображения и видео MP4, MOV или WebM");
    if (file.size > (isVideo ? 40 : 8) * 1024 * 1024) return jsonError(isVideo ? "Видео больше 40 МБ" : "Изображение больше 8 МБ");
    const token = randomUUID().replaceAll("-", "");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (isImage) {
      const optimized = await optimizeAgentCover(bytes, mime);
      if (!optimized) return jsonError("Не удалось обработать изображение");
      const id = `agent-${purpose}-${token}`;
      await storeMediaAsset(id, "image", optimized.mime, optimized.bytes);
      return Response.json({ kind: "image", url: `/api/agents/assets/${id}`, previewUrl: `/api/agents/assets/${id}` });
    }
    const id = `agent-video-${token}`;
    const previewId = `agent-preview-${token}`;
    const preview = await createAgentVideoLoopPreview(bytes);
    if (!preview) return jsonError("Не удалось подготовить лёгкое превью видео");
    await storeMediaAsset(id, "video", mime, bytes);
    await storeMediaAsset(previewId, "video", preview.mime, preview.bytes);
    return Response.json({ kind: "video", url: `/api/agents/assets/${id}`, previewUrl: `/api/agents/assets/${previewId}` });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход", 401);
    console.error("agent_asset_upload_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось загрузить файл", 500);
  }
}
