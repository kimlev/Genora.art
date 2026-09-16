import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { isGoogleOAuthConfigured } from "@/lib/server/google-oauth";
import { SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return {
    title: `${t.auth.signUpTitle} — ${SITE_NAME}`,
    description: t.auth.signUpSubtitle,
    alternates: { canonical: "/register" },
    robots: { index: false, follow: false },
  };
}

// Google availability is read from the runtime environment, not from the build image.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthShell>
      <AuthForm mode="register" googleEnabled={isGoogleOAuthConfigured()} />
    </AuthShell>
  );
}
