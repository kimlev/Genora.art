import { timingSafeEqual } from "node:crypto";
import { syncSupportInbox } from "@/lib/server/support-inbox";
import { processDueSupportRequests } from "@/lib/server/support-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: Request): boolean {
  const expected = process.env.SUPPORT_WORKER_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const inbox = await syncSupportInbox();
  return Response.json({ ok: true, inbox, ...(await processDueSupportRequests()) });
}
