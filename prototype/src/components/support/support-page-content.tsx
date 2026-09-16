"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/security/turnstile";
import { IS_STAGING } from "@/lib/site-env";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { usePublicContactEmail } from "@/components/layout/use-public-contact-email";
import { useState, type FormEvent } from "react";

type SubmitStatus = "idle" | "sending" | "sent" | "error";

const DEFAULT_TOPIC = "cooperation";

export function SupportPageContent() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const contactEmail = usePublicContactEmail();
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(IS_STAGING ? "staging" : null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setStatusMessage("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          topic,
          message: data.get("message"),
          website: data.get("website"),
          turnstileToken,
          locale,
        }),
      });

      if (response.ok) {
        const payload = await response.json().catch(() => null) as { id?: string } | null;
        form.reset();
        setTopic(DEFAULT_TOPIC);
        setStatus("sent");
        setStatusMessage(payload?.id ? `${t.support.sent} (${payload.id})` : t.support.sent);
        return;
      }

      setStatus("error");
      setStatusMessage(response.status === 429 ? t.support.rateLimited : t.support.error);
      setTurnstileToken(null);
      setTurnstileResetKey((value) => value + 1);
    } catch {
      setStatus("error");
      setStatusMessage(t.support.error);
      setTurnstileToken(null);
      setTurnstileResetKey((value) => value + 1);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {t.support.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-steel sm:text-lg">
          {t.support.subtitle}
        </p>
        <p className="mt-2 text-sm text-steel">{t.support.responseTime}</p>
        {!user ? (
          <a
            href={`mailto:${contactEmail}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text transition-colors hover:bg-mist"
          >
            <Mail className="size-4 text-steel" />
            <span className="font-medium">Email</span>
            <span className="text-steel">{contactEmail}</span>
          </a>
        ) : null}
      </header>

      <section className="mx-auto mt-12 max-w-xl">
        <h2 className="text-center text-xl font-semibold text-text">{t.support.formTitle}</h2>
        <form
          className="relative mt-4 space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="support-name">{t.support.name}</Label>
            <Input id="support-name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={user?.name ?? user?.nickname ?? ""} className="h-11 bg-bg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">{t.support.emailLabel}</Label>
            <Input id="support-email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={user?.email ?? ""} className="h-11 bg-bg" />
          </div>

          <div className="space-y-2">
            <Label>{t.support.topic}</Label>
            <SelectMenu
              ariaLabel={t.support.topic}
              value={topic}
              options={[
                { value: DEFAULT_TOPIC, label: t.support.topicOptions.cooperation },
                { value: "billing-refund", label: t.support.topicOptions.billingRefund },
                { value: "other", label: t.support.topicOptions.other },
              ]}
              onChange={setTopic}
              className="min-h-11 bg-bg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">{t.support.message}</Label>
            <Textarea id="support-message" name="message" required minLength={10} maxLength={4_000} rows={6} className="bg-bg" />
          </div>

          <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
            {/* Ловушка для ботов: поле скрыто от людей, поэтому подпись не переводится */}
            <Label htmlFor="support-website">Website</Label>
            <Input id="support-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-mist/70 px-3.5 py-3 text-xs leading-relaxed text-steel">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-brand" />
            {t.support.antiSpam}
          </div>

          <Turnstile action="support" resetKey={turnstileResetKey} onToken={setTurnstileToken} onError={() => { setStatus("error"); setStatusMessage(t.support.error); }} />

          {statusMessage ? (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                status === "sent"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/15 text-red-700 dark:text-red-300"
              }`}
            >
              {status === "sent" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
              {statusMessage}
            </div>
          ) : null}

          <Button type="submit" disabled={status === "sending" || !turnstileToken} className="h-11 w-full gap-2">
            {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {status === "sending" ? t.support.sending : t.support.submit}
          </Button>
        </form>
      </section>
    </div>
  );
}
