import { getBlogoroMedia } from "@/lib/server/blogoro-publish";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const media = await getBlogoroMedia((await params).id);
  if (!media) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "content-type": media.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
