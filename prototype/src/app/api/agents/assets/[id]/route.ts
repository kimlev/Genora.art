import { query } from "@/lib/server/db";
import { parseSingleByteRange } from "@/lib/server/byte-range";
import { loadMediaAsset } from "@/lib/server/media-assets";
import { videoResponse } from "@/lib/server/video-response";
import { requireAdmin } from "@/lib/server/admin-session";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^agent-(?:cover|video|preview|reference)-[a-f0-9]{32}$/.test(id)) return new Response(null, { status: 404 });
    const assetUrl = `/api/agents/assets/${id}`;
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM system_agent_overrides
        WHERE cover_url=$1 OR video_url=$1 OR video_preview_url=$1 OR reference_inputs::text LIKE $2
      ) exists`,
      [assetUrl, `%${assetUrl}%`],
    );
    if (!rows[0]?.exists) {
      try { await requireAdmin(); }
      catch { return new Response(null, { status: 404 }); }
    }
    const asset = await loadMediaAsset(id);
    if (!asset) return new Response(null, { status: 404 });
    if (asset.mime.startsWith("video/")) {
      return videoResponse(request, { mime: asset.mime, size: asset.bytes.byteLength }, async (start, length) => new Uint8Array(asset.bytes.subarray(start, start + length)));
    }
    const range = parseSingleByteRange(request.headers.get("range"), asset.bytes.byteLength);
    if (range === null) return new Response(null, { status: 416 });
    return new Response(new Uint8Array(asset.bytes), {
      headers: {
        "content-type": asset.mime,
        "content-length": String(asset.bytes.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return new Response(null, { status: (error as Error & { statusCode?: number }).statusCode === 404 ? 404 : 500 });
  }
}
