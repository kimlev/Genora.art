import { withLocalePath } from "@/lib/i18n/locale-path";
import { isRequestLocale } from "@/lib/locale-from-request";
import { permanentRedirect } from "next/navigation";

export default async function LegacySongPage({ params }: PageProps<"/[locale]/song">) {
  const { locale } = await params;
  permanentRedirect(isRequestLocale(locale) ? withLocalePath("/songs", locale) : "/songs");
}
