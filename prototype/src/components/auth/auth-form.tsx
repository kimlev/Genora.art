"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { Turnstile } from "@/components/security/turnstile";
import { PinTiles } from "@/components/security/pin-tiles";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthMailCopy } from "@/lib/mail-auth-copy";
import { getRegistrationDeliveryCopy } from "@/lib/i18n/copy/registration-delivery";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/locale-link";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { IS_STAGING } from "@/lib/site-env";
import NextLink from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type AuthFormMode = "login" | "register";

type AuthFormProps = {
  mode: AuthFormMode;
  googleEnabled?: boolean;
  initialError?: string | null;
  pinPending?: boolean;
};

export function AuthForm({ mode, googleEnabled = false, initialError = null, pinPending = false }: AuthFormProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useLocaleRouter();
  const { signIn, completePin } = useAuth();
  const isRegister = mode === "register";
  const registrationDeliveryCopy = getRegistrationDeliveryCopy(locale);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    const visitorKey = localStorage.getItem("ms-visitor") ?? crypto.randomUUID();
    localStorage.setItem("ms-visitor", visitorKey);
    sessionStorage.setItem("ms-ref", ref);
    void fetch("/api/welcome-bonus/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: ref, visitorKey }),
    }).catch(() => undefined);
  }, []);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(IS_STAGING ? "staging" : null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [pinRequired, setPinRequired] = useState(pinPending);
  const [pin, setPin] = useState("");
  const passwordValid = passwordValue.length >= 8 && passwordValue.length <= 128;
  const passwordsMatch = passwordValid && passwordValue === confirmPasswordValue;
  const showPasswordMismatch = isRegister && confirmPasswordValue.length > 0 && !passwordsMatch;

  const finishLogin = () => {
    router.push("/chat");
  };

  const submitPin = async () => {
    if (pin.length !== 4) return setError(t.auth.pinInvalid);
    setSubmitting(true);
    setError(null);
    const result = await completePin(pin);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? t.auth.pinInvalid);
      setPin("");
      return;
    }
    finishLogin();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pinRequired) {
      await submitPin();
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (isRegister) {
      if (!termsAccepted || !privacyAccepted) {
        return;
      }

      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");

      if (password !== confirmPassword) {
        setPasswordMismatch(true);
        return;
      }
    }

    setPasswordMismatch(false);
    setError(null);
    setSubmitting(true);
    const result = await signIn(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
      isRegister ? "register" : "login",
      !isRegister && remember,
      isRegister ? { termsAccepted, privacyAccepted } : undefined,
      turnstileToken ?? undefined,
      locale,
    );
    setSubmitting(false);
    if (result.pinRequired) {
      setPinRequired(true);
      setPin("");
      setError(null);
      return;
    }
    if (!result.ok) {
      setError(result.error ?? t.auth.signInFailed);
      setTurnstileToken(null);
      setTurnstileResetKey((value) => value + 1);
      return;
    }
    if (result.pendingVerification) {
      form.reset();
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setPasswordMismatch(false);
      setError(null);
      setEmailValue("");
      setPasswordValue("");
      setConfirmPasswordValue("");
      setVerificationMessage(result.message?.trim() || getAuthMailCopy(locale).verification.title);
      return;
    }
    finishLogin();
  };

  if (verificationMessage) {
    return (
      <div
        className="rounded-xl bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300"
        role="status"
      >
        <p>{verificationMessage}</p>
        <p className="mt-2 font-normal">{registrationDeliveryCopy.checkSpam}</p>
        <Link href="/support" className="mt-2 inline-block font-normal underline underline-offset-4 hover:text-text">
          {registrationDeliveryCopy.supportLink}
        </Link>
      </div>
    );
  }

  if (pinRequired && !isRegister) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-steel">{t.auth.welcomeBack}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">{t.auth.pinLabel}</h1>
          <p className="mt-1.5 text-sm text-steel">{t.auth.pinHint}</p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <PinTiles id="login-pin" value={pin} onChange={(value) => { setPin(value); setError(null); }} autoFocus ariaLabel={t.auth.pinLabel} />
          <Button
            type="submit"
            disabled={submitting || pin.length !== 4}
            className={cn(
              "mt-1 h-10 w-full border-transparent bg-text text-surface hover:bg-text/90",
              "disabled:bg-text/40 disabled:text-surface/80",
            )}
          >
            {submitting ? t.auth.pleaseWait : t.auth.signIn}
          </Button>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {isRegister ? null : (
          <p className="text-sm font-medium text-steel">{t.auth.welcomeBack}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
          {isRegister ? t.auth.signUpTitle : t.auth.signInTitle}
        </h1>
        <p className="mt-1.5 text-sm text-steel">
          {isRegister ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
        </p>
      </div>

      {googleEnabled ? (
        <div className="flex flex-col gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            className="h-11 w-full gap-3 bg-surface text-text hover:bg-mist"
            render={<NextLink href="/api/auth/google/start?next=%2Fchat" rel="nofollow" />}
          >
            <GoogleMark />
            {t.auth.continueWith} Google
          </Button>
          {isRegister ? (
            <p className="text-center text-xs leading-snug text-steel">
              {t.auth.googleTermsPrefix}{" "}
              <Link href="/legal/terms" className="text-text underline-offset-4 hover:underline">
                {t.auth.termsLink}
              </Link>{" "}
              {t.auth.googleTermsAnd}{" "}
              <Link href="/legal/privacy" className="text-text underline-offset-4 hover:underline">
                {t.auth.privacyPolicyLink}
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          title={t.auth.googleSoonHint}
          className="h-11 w-full gap-3 bg-surface text-text hover:bg-mist"
        >
          <GoogleMark />
          {t.auth.continueWith} Google · {t.auth.googleSoon}
        </Button>
      )}

      <div className="flex items-center gap-3 text-xs text-steel">
        <span className="h-px flex-1 bg-border" />
        <span>{t.auth.emailDivider}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="h-10 bg-surface"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            className="h-10 bg-surface"
            value={passwordValue}
            onChange={(event) => setPasswordValue(event.target.value)}
          />
          {isRegister ? <PasswordStrengthMeter password={passwordValue} /> : null}
          {!isRegister ? (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-accent-brand underline-offset-4 hover:underline">
                {t.auth.forgotPassword}
              </Link>
            </div>
          ) : null}
        </div>

        {isRegister ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                aria-invalid={passwordMismatch || showPasswordMismatch}
                className="h-10 bg-surface"
                value={confirmPasswordValue}
                onChange={(event) => { setConfirmPasswordValue(event.target.value); setPasswordMismatch(false); }}
              />
              {passwordMismatch || showPasswordMismatch ? (
                <p className="text-sm text-destructive">{t.auth.passwordMismatch}</p>
              ) : null}
            </div>

            <label className="flex items-start gap-3 text-sm leading-snug text-steel">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border border-input accent-text"
                required
              />
              <span>
                {t.auth.acceptTermsPrefix}{" "}
                <Link href="/legal/terms" className="font-medium text-text underline-offset-4 hover:underline">
                  {t.auth.termsLink}
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm leading-snug text-steel">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border border-input accent-text"
                required
              />
              <span>
                {t.auth.acceptPrivacyPrefix}{" "}
                <Link
                  href="/legal/privacy"
                  className="font-medium text-text underline-offset-4 hover:underline"
                >
                  {t.auth.privacyPolicyLink}
                </Link>
              </span>
            </label>
          </>
        ) : <label className="flex items-center gap-2 text-sm text-steel"><input type="checkbox" checked={remember} onChange={(event)=>setRemember(event.target.checked)} className="size-4 rounded border border-input accent-text" /><span>{t.auth.rememberMe}</span></label>}

        <Turnstile
          action={isRegister ? "register" : "login"}
          resetKey={turnstileResetKey}
          onToken={setTurnstileToken}
          onError={() => setError(t.auth.turnstileError)}
        />

        <Button
          type="submit"
          disabled={submitting || !turnstileToken}
          className={cn(
            "mt-1 h-10 w-full border-transparent bg-text text-surface hover:bg-text/90",
            "disabled:bg-text/40 disabled:text-surface/80",
          )}
        >
          {submitting ? t.auth.pleaseWait : isRegister ? t.auth.signUp : t.auth.signIn}
        </Button>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </form>

      <p className="text-center text-sm text-steel">
        {isRegister ? t.auth.hasAccount : t.auth.noAccount}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-text underline-offset-4 hover:underline"
        >
          {isRegister ? t.auth.signIn : t.auth.signUp}
        </Link>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.4 3.18 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}
