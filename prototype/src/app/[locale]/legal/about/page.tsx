import { withLocalePath } from "@/lib/i18n/locale-path";
import { isRequestLocale } from "@/lib/locale-from-request";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function LegacyAboutPage({ params }: PageProps<"/[locale]/legal/about">) {
  const { locale } = await params;
  redirect(isRequestLocale(locale) ? withLocalePath("/about", locale) : "/about");
}
