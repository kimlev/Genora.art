import { timingSafeEqual } from "node:crypto";
import { runDueYoutubeAutomations } from "@/lib/server/youtube-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const expected = process.env.SUPPORT_WORKER_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, ...(await runDueYoutubeAutomations()) });
}
