"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useState, type FormEvent } from "react";

export function PasswordRecoveryForm() {
  const { locale, dictionary: t } = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: formData.get("email"), locale }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => null) as { error?: string } | null : null;
      setError(payload?.error ?? t.auth.serverUnavailable);
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-steel">{t.auth.recoveryEyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">{t.auth.forgotPassword}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-steel">
          {t.auth.recoverySubtitle}
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 font-medium text-text"><CheckCircle2 className="size-5 text-emerald-500" />{t.auth.recoveryAcceptedTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-steel">{t.auth.recoveryAcceptedText}</p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="h-10 bg-surface" />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading} className="mt-1 h-10 w-full border-transparent bg-text text-surface hover:bg-text/90">
            {loading ? t.auth.recoverySending : t.auth.recoverySubmit}
          </Button>
        </form>
      )}

      <Link href="/login" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-text underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" />{t.auth.recoveryBack}
      </Link>
    </div>
  );
}
