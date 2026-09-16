"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";
import { useSyncExternalStore } from "react";

const CONSENT_KEY = "genora-cookie-consent";
const CONSENT_EVENT = "genora-cookie-consent-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(CONSENT_KEY) ?? "pending";
}

function saveConsent(value: "accepted" | "rejected") {
  localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function CookieConsent() {
  const t = useT();
  const consent = useSyncExternalStore(subscribe, getSnapshot, () => "loading");
  if (consent !== "pending") return null;

  return (
    <aside
      role="dialog"
      aria-label={t.legal.consent.dialogLabel}
      className="fixed bottom-4 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-border bg-surface p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:flex sm:items-center sm:gap-5 sm:p-5"
    >
      <p className="flex-1 text-sm leading-relaxed text-steel">
        {t.legal.consent.text}{" "}
        <Link href="/legal/cookies" className="font-medium text-accent-brand underline underline-offset-4">{t.legal.consent.more}</Link>
      </p>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <Button variant="outline" className="h-10 rounded-xl" onClick={() => saveConsent("rejected")}>{t.legal.consent.reject}</Button>
        <Button className="h-10 rounded-xl" onClick={() => saveConsent("accepted")}>{t.legal.consent.accept}</Button>
      </div>
    </aside>
  );
}
