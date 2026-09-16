"use client";

import { useT } from "@/components/providers/locale-provider";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const t = useT();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      const timer=window.setTimeout(()=>{setState("error");setMessage(t.auth.verifyMissingToken)},0);
      return ()=>window.clearTimeout(timer);
    }
    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? t.auth.verifyInvalidLink);
      setState("success");
      setMessage(t.auth.verifySuccess);
    }).catch((error: Error) => {
      setState("error");
      setMessage(error.message);
    });
    // Сообщение выбирается один раз при проверке ссылки, поэтому язык берём на момент запроса
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <main className="grid min-h-dvh place-items-center bg-bg px-4"><div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-xl">
    {state === "loading" ? <Loader2 className="mx-auto size-10 animate-spin text-accent-brand" /> : state === "success" ? <CheckCircle2 className="mx-auto size-10 text-emerald-500" /> : <XCircle className="mx-auto size-10 text-destructive" />}
    <h1 className="mt-5 text-2xl font-semibold text-text">{state === "success" ? t.auth.verifySuccessTitle : state === "error" ? t.auth.verifyErrorTitle : t.auth.verifyCheckingTitle}</h1>
    <p className="mt-3 text-sm leading-relaxed text-steel">{message ?? t.auth.verifyChecking}</p>
    {state !== "loading" ? <Link className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent-brand px-4 text-sm font-semibold text-white" href={state === "success" ? "/login" : "/register"}>{state === "success" ? t.auth.verifySignIn : t.auth.verifyRetry}</Link> : null}
  </div></main>;
}
