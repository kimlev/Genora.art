import { withLocalePath } from "@/lib/i18n/locale-path";
import { isRequestLocale } from "@/lib/locale-from-request";
import { CREATE_FOTO_VIDEO_PATH } from "@/lib/routes";
import { redirect } from "next/navigation";

export default async function LegacyImagesRedirect({ params }: PageProps<"/[locale]/images">) {
  const { locale } = await params;
  redirect(isRequestLocale(locale) ? withLocalePath(CREATE_FOTO_VIDEO_PATH, locale) : CREATE_FOTO_VIDEO_PATH);
}
