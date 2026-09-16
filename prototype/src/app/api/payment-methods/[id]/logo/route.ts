import { getMethodLogo } from "@/lib/server/payments";

export const runtime = "nodejs";

/** Логотип метода оплаты виден и клиенту при пополнении, поэтому маршрут открытый. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const logo = await getMethodLogo((await params).id);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "content-type": logo.mime,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
