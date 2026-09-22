"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { welcomeBonusCopy } from "@/lib/i18n/copy/welcome-bonus-copy";
import { useLocalePush } from "@/lib/i18n/use-locale-push";
import { CREATE_FOTO_VIDEO_PATH } from "@/lib/routes";
import { getLocaleOption } from "@/lib/i18n";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { formatWelcomeTokens, type WelcomeBonusProgress } from "@/lib/welcome-bonus";
import { Check, Gift, Mail, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function WelcomeBonusCard() {
  const { locale } = useLocale();
  const pushLocale = useLocalePush();
  const copy = welcomeBonusCopy(locale);
  const intl = getLocaleOption(locale).intl;
  const [progress, setProgress] = useState<WelcomeBonusProgress | null>(null);
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetch("/api/welcome-bonus", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { progress?: WelcomeBonusProgress | null } | null) => {
          if (active) setProgress(data?.progress ?? null);
        })
        .catch(() => undefined);
    };
    refresh();
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/welcome-bonus", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { progress?: WelcomeBonusProgress | null } | null) => {
        setProgress(data?.progress ?? null);
      })
      .catch(() => undefined);
  }, [open]);

  if (!progress?.active || !progress.showTeaser) return null;

  const shareText = copy.inviteMessage(progress.referralUrl);
  const creditDate = new Date(progress.creditAt).toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" });
  const copyInvite = async () => {
    await navigator.clipboard.writeText(shareText).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const openInvite = () => {
    void copyInvite();
    setInviteOpen(true);
  };

  return (
    <>
      <div className="relative mb-2 rounded-2xl border border-border bg-surface p-3 shadow-sm text-text">
        <button type="button" aria-label={copy.title} className="absolute end-2 top-2 rounded-md p-1 text-steel hover:bg-mist" onClick={() => { void fetch("/api/welcome-bonus", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "dismiss" }) }); setProgress({ ...progress, showTeaser: false }); }}>
          <X className="size-3.5" />
        </button>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-start gap-2.5 pe-6 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-brand/10 text-accent-brand"><Gift className="size-4" /></span>
          <span className="text-sm leading-snug text-text">
            {withCreditGlyphs(copy.teaser.replace("{k}", String(Math.round(progress.total / 1000))))}
            <b className="text-accent-brand">{copy.free}</b>
          </span>
        </button>
      </div>
      {open ? createPortal(
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-[26px] border border-border bg-surface p-5 text-text shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-text">{copy.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-steel hover:bg-mist"><X className="size-4" /></button>
            </div>
            <div className="mt-4 rounded-2xl bg-mist/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{copy.welcomeTitle}</p>
                  <p className="mt-1 text-xs text-steel">{copy.welcomeNote}</p>
                </div>
                <p className="shrink-0 text-[1.575rem] font-semibold leading-none text-accent-brand">{withCreditGlyphs(formatWelcomeTokens(progress.total, locale))}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-steel">
                <span>{copy.progress}</span>
                <span className="font-semibold text-emerald-600 dark:text-white">{withCreditGlyphs(formatWelcomeTokens(progress.earned, locale))}</span>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {progress.tasks.map((task) => {
                const item = copy.tasks[task.id];
                const percent = Math.min(100, Math.round((task.progress / task.required) * 100));
                return (
                  <li key={task.id} className="rounded-2xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{item.title}</p>
                        {task.id === "tracks" ? <p className="mt-0.5 text-xs text-steel">{item.hint}</p> : null}
                      </div>
                      <span className="text-[1.8em] font-semibold leading-none text-accent-brand">{withCreditGlyphs(formatWelcomeTokens(task.maxBonus, locale))}</span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3 text-xs">
                      <span className="text-steel">{copy.yourProgress}</span>
                      <span className="font-semibold text-emerald-600 dark:text-white">{withCreditGlyphs(formatWelcomeTokens(task.earned, locale))}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                      <div className="h-full rounded-full bg-accent-brand" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-steel">{task.progress}</div>
                    {task.id === "login" ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Array.from({ length: task.required }, (_, index) => {
                          const day = progress.loginDays[index];
                          const done = Boolean(day);
                          const label = day
                            ? new Date(`${day}T00:00:00.000Z`).toLocaleDateString(intl, { weekday: "short" })
                            : String(index + 1);
                          return (
                            <span key={`${task.id}-${index}`} className={`grid size-8 place-items-center rounded-full text-[10px] ${done ? "bg-emerald-500 text-white" : "border border-border text-steel"}`}>
                              {done ? <Check className="size-3.5" /> : label}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    {task.id === "texts" ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setOpen(false); pushLocale("/chat"); }}>{copy.create}</Button> : null}
                    {task.id === "images" ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setOpen(false); pushLocale(CREATE_FOTO_VIDEO_PATH); }}>{copy.create}</Button> : null}
                    {task.id === "tracks" ? <Button type="button" size="sm" variant="outline" className="mt-2" disabled>{copy.create}</Button> : null}
                    {task.id === "friends" ? <Button type="button" size="sm" className="mt-2" onClick={openInvite}>{copy.invite}</Button> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-text">{copy.creditNote(creditDate)}</p>
          </div>
        </div>,
        document.body,
      ) : null}
      {inviteOpen ? createPortal(
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[26px] border border-border bg-surface p-5 text-text shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-text">{copy.inviteTitle}</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-xl p-2 text-steel hover:bg-mist"><X className="size-4" /></button>
            </div>
            <p className="mt-2 text-xs text-steel">{copy.inviteHint}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-mist/70 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-sm text-text">{progress.referralUrl}</p>
              <Button type="button" size="xs" onClick={() => void copyInvite()}>{copied ? copy.copied : copy.copyLink}</Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-2 py-2 text-xs text-text hover:bg-mist" href={`mailto:?body=${encodeURIComponent(shareText)}`} onClick={() => void copyInvite()}><Mail className="size-3.5" />{copy.shareEmail}</a>
              <a className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-2 py-2 text-xs text-text hover:bg-mist" href={`https://t.me/share/url?url=${encodeURIComponent(progress.referralUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" onClick={() => void copyInvite()}><Send className="size-3.5" />{copy.shareTelegram}</a>
              <a className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-2 py-2 text-xs text-text hover:bg-mist" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" onClick={() => void copyInvite()}>{copy.shareWhatsapp}</a>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
