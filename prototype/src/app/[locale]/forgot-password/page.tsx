import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return {
    title: `${t.auth.recoveryEyebrow} — ${SITE_NAME}`,
    description: t.auth.recoverySubtitle,
    alternates: { canonical: "/forgot-password" },
    robots: { index: false, follow: false },
  };
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <PasswordRecoveryForm />
    </AuthShell>
  );
}
