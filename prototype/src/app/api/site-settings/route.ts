import { getRegistrationBonusThousands, getRegistrationBonusTokens } from "@/lib/server/site-settings";
import { getPrimarySupportEmail } from "@/lib/server/support-mailboxes";
import { DEFAULT_PUBLIC_EMAIL } from "@/lib/public-contact";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registrationBonusThousands = await getRegistrationBonusThousands();
    let contactEmail = DEFAULT_PUBLIC_EMAIL;
    try {
      contactEmail = await getPrimarySupportEmail();
    } catch {
      contactEmail = DEFAULT_PUBLIC_EMAIL;
    }
    return Response.json({
      registrationBonusThousands,
      registrationBonusTokens: await getRegistrationBonusTokens(),
      contactEmail,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("site_settings_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось загрузить настройки", 500);
  }
}
