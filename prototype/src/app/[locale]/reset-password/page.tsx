import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return {
    title: `${t.auth.resetTitle} — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default function ResetPasswordPage() {
  return <AuthShell><ResetPasswordForm /></AuthShell>;
}
