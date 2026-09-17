"use client";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/components/providers/locale-provider";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  REJECTED_CONSENT,
  parseCookieConsent,
  serializeCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";
import { SITE_ORIGIN } from "@/lib/site-env";
import { Check, Cookie, LockKeyhole, Settings2 } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";
}

function saveConsent(value: CookieConsentPreferences) {
  localStorage.setItem(CONSENT_STORAGE_KEY, serializeCookieConsent(value));
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function CookieConsent() {
  const t = useT();
  const { locale } = useLocale();
  const storedConsent = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const consent = parseCookieConsent(storedConsent);
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<CookieConsentPreferences>(REJECTED_CONSENT);
  const fallback = locale === "ru" ? {
    customize: "Настроить", save: "Сохранить выбор", essential: "Обязательные cookies — всегда включены", analytics: "Аналитика", advertising: "Реклама и персонализация",
  } : {
    customize: "Customize", save: "Save choices", essential: "Essential cookies — always enabled", analytics: "Analytics", advertising: "Advertising and personalization",
  };
  const copy = {
    customize: t.legal.consent.customize ?? fallback.customize,
    save: t.legal.consent.save ?? fallback.save,
    essential: t.legal.consent.essential ?? fallback.essential,
    analytics: t.legal.consent.analytics ?? fallback.analytics,
    advertising: t.legal.consent.advertising ?? fallback.advertising,
  };

  useEffect(() => {
    const open = () => {
      setDraft(parseCookieConsent(localStorage.getItem(CONSENT_STORAGE_KEY)) ?? REJECTED_CONSENT);
      setCustomizing(true);
      setManuallyOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  const closeAfterSave = (value: CookieConsentPreferences) => {
    saveConsent(value);
    setDraft(value);
    setCustomizing(false);
    setManuallyOpen(false);
  };

  if (consent && !manuallyOpen) return null;

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={t.legal.consent.dialogLabel}
      className="fixed bottom-4 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 overflow-hidden rounded-3xl border border-[#FF6F00]/45 bg-[#111111] text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="h-1 bg-[#FF6F00]" />
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#FF6F00]/15 text-[#FF6F00]">
            <Cookie className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">{t.legal.consent.dialogLabel}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/70">
              {t.legal.consent.text}{" "}
              <NextLink href={`${SITE_ORIGIN}/${locale}/legal/privacy`} className="font-medium text-[#FF6F00] underline underline-offset-4">{t.legal.consent.more}</NextLink>
            </p>
          </div>
        </div>

        {customizing ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#FF6F00]/30 bg-[#FF6F00]/[0.08] px-4 py-3 text-sm font-medium text-white/90">
              <span>{copy.essential}</span><LockKeyhole className="size-5 shrink-0 text-[#FF8A1C]" />
            </div>
            <ConsentToggle
              checked={draft.analytics}
              label={copy.analytics}
              onChange={(analytics) => setDraft((current) => ({ ...current, analytics }))}
            />
            <ConsentToggle
              checked={draft.advertising}
              label={copy.advertising}
              onChange={(advertising) => setDraft((current) => ({ ...current, advertising }))}
            />
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-11 rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => closeAfterSave(REJECTED_CONSENT)}>
            {t.legal.consent.reject}
          </Button>
          {customizing ? (
            <Button className="h-11 rounded-xl bg-[#FF6F00] text-white hover:bg-[#E85200]" onClick={() => closeAfterSave(draft)}>
              <Check className="size-4" />{copy.save}
            </Button>
          ) : (
            <Button variant="outline" className="h-11 rounded-xl border-[#FF6F00]/60 bg-transparent text-[#FF8A1C] hover:bg-[#FF6F00]/10 hover:text-[#FF8A1C]" onClick={() => setCustomizing(true)}>
              <Settings2 className="size-4" />{copy.customize}
            </Button>
          )}
          <Button className="h-11 rounded-xl bg-[#FF6F00] text-white hover:bg-[#E85200]" onClick={() => closeAfterSave({ version: 2, analytics: true, advertising: true })}>
            {t.legal.consent.accept}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ConsentToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/90">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[#FF6F00]" />
    </label>
  );
}
