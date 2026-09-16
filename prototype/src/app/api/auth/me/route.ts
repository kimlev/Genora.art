import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ user: await currentUser() });
}
