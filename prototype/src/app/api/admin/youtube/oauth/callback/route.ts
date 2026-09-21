import { currentAdmin } from "@/lib/server/admin-session";
import { publicAdminOrigin } from "@/lib/server/public-origins";
import { finishYoutubeAuthorization } from "@/lib/server/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicAdminOrigin();
  const admin = await currentAdmin();
  if (!admin) return Response.redirect(`${origin}/login`, 303);
  const error = url.searchParams.get("error");
  if (error) return Response.redirect(`${origin}/?section=youtube-connect&oauth=${encodeURIComponent(error)}`, 303);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  let outcome = "connected";
  try {
    await finishYoutubeAuthorization(admin.id, state, code);
  } catch (caught) {
    outcome = caught instanceof Error ? caught.message : "oauth_failed";
  }
  return Response.redirect(`${origin}/?section=youtube-connect&oauth=${encodeURIComponent(outcome)}`, 303);
}
