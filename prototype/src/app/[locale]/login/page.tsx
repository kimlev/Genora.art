import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { authErrorMessage } from "@/lib/auth-errors";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { isGoogleOAuthConfigured } from "@/lib/server/google-oauth";
import { hasPendingPinChallenge } from "@/lib/server/pending-pin";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return {
    title: t.auth.signInTitle,
    description: t.auth.signInSubtitle,
    alternates: { canonical: "/login" },
    robots: { index: false, follow: false },
  };
}

// Google availability is read from the runtime environment, not from the build image.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error, pin } = await searchParams;
  const pinValue = Array.isArray(pin) ? pin[0] : pin;
  const locale = await requestLocale();
  return (
    <AuthShell>
      <AuthForm
        mode="login"
        googleEnabled={isGoogleOAuthConfigured()}
        initialError={authErrorMessage(error, locale)}
        pinPending={pinValue === "1" || await hasPendingPinChallenge()}
      />
    </AuthShell>
  );
}
