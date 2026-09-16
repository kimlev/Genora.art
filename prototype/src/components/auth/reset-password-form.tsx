"use client";

import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useEffect, useState, type FormEvent } from "react";

export function ResetPasswordForm() {
  const t = useT();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const value = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    const timer = window.setTimeout(() => {
      setToken(value);
      if (!value) setError(t.auth.resetMissingToken);
    }, 0);
    return () => window.clearTimeout(timer);
    // Проверяем ссылку один раз при открытии страницы
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError(t.auth.passwordMismatch);
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { error?: string } | null : null;
    if (!response?.ok) {
      setError(payload?.error ?? t.auth.resetFailed);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  if (success) return <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><h1 className="text-2xl font-semibold text-text">{t.auth.resetDoneTitle}</h1><p className="text-sm text-steel">{t.auth.resetDoneText}</p><Button nativeButton={false} className="w-full" render={<Link href="/login" />}>{t.auth.signIn}</Button></div>;

  return <form onSubmit={submit} className="space-y-4"><div><p className="text-sm font-medium text-steel">{t.auth.recoveryEyebrow}</p><h1 className="mt-1 text-2xl font-semibold text-text">{t.auth.resetTitle}</h1></div><div className="space-y-2"><Label htmlFor="new-password">{t.auth.password}</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} /><PasswordStrengthMeter password={password} /></div><div className="space-y-2"><Label htmlFor="confirm-password">{t.auth.resetRepeatPassword}</Label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(null); }} /></div>{error ? <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" />{error}</p> : null}<Button type="submit" disabled={loading || !token} className="w-full">{loading ? t.auth.resetSaving : t.auth.resetSubmit}</Button></form>;
}
