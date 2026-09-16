import { query } from "@/lib/server/db";
import { serveMediaAsset } from "@/lib/server/media-assets";
import { requireUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) return new Response(null, { status: 404 });
    const rows = await query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM music_tracks WHERE user_id=$1 AND asset_id=$2) exists", [user.id, id]);
    if (!rows[0]?.exists) return new Response(null, { status: 404 });
    const asset = await serveMediaAsset("music", id);
    const download = new URL(request.url).searchParams.get("download");
    const headers: Record<string, string> = {
      "content-type": asset.mime,
      "content-length": String(asset.bytes.byteLength),
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    };
    if (download) headers["content-disposition"] = `attachment; filename="${download}"`;
    return new Response(new Uint8Array(asset.bytes), { headers });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return new Response(null, { status: 401 });
    return new Response(null, { status: (error as Error & { statusCode?: number }).statusCode === 404 ? 404 : 502 });
  }
}
