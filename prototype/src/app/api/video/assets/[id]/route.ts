import { query } from "@/lib/server/db";
import { parseSingleByteRange } from "@/lib/server/byte-range";
import { serveMediaAsset } from "@/lib/server/media-assets";
import { requireUser } from "@/lib/server/session";
import { videoResponse } from "@/lib/server/video-response";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return new Response(null, { status: 404 });
    const rows = await query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM video_generations WHERE user_id=$1 AND $2=ANY(asset_ids)) exists", [user.id, id]);
    if (!rows[0]?.exists) return new Response(null, { status: 404 });
    const wantsPreview = new URL(request.url).searchParams.get("variant") === "preview";
    if (!wantsPreview) {
      const [local] = await query<{ mime: string; byte_length: number }>(
        "SELECT mime,byte_length FROM media_assets WHERE id=$1 AND kind='video' AND byte_length>0", [id],
      );
      if (local) return videoResponse(request, { mime: local.mime, size: local.byte_length }, async (start, length) => {
        const [chunk] = await query<{ bytes: Buffer }>(
          "SELECT substring(bytes FROM $2::int FOR $3::int) AS bytes FROM media_assets WHERE id=$1 AND kind='video'",
          [id, start + 1, length],
        );
        if (!chunk) throw new Error("MEDIA_GONE");
        return new Uint8Array(chunk.bytes);
      });
    }
    const asset = await serveMediaAsset("video", id, wantsPreview ? "preview" : "original");
    const total = asset.bytes.byteLength;
    if (wantsPreview) {
      if (!asset.mime.startsWith("image/")) return new Response(null, { status: 404 });
      return new Response(new Uint8Array(asset.bytes), {
        headers: {
          "cache-control": "private, max-age=31536000, immutable",
          "content-length": String(total),
          "content-type": asset.mime,
          "x-content-type-options": "nosniff",
        },
      });
    }
    const range = parseSingleByteRange(request.headers.get("range"), total);
    const headers = {
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=31536000, immutable",
      "content-type": asset.mime,
      "x-content-type-options": "nosniff",
    };
    if (range === null) {
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${total}` } });
    }
    if (range) {
      const bytes = asset.bytes.subarray(range.start, range.end + 1);
      return new Response(new Uint8Array(bytes), {
        status: 206,
        headers: {
          ...headers,
          "content-length": String(bytes.byteLength),
          "content-range": `bytes ${range.start}-${range.end}/${total}`,
        },
      });
    }
    return new Response(new Uint8Array(asset.bytes), { headers: { ...headers, "content-length": String(total) } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return new Response(null, { status: 401 });
    return new Response(null, { status: (error as Error & { statusCode?: number }).statusCode === 404 ? 404 : 502 });
  }
}
