"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { CONSENT_CHANGE_EVENT, CONSENT_STORAGE_KEY, cookieConsentFromHeader, googleConsentSignals, parseCookieConsent } from "@/lib/cookie-consent";
import { IS_STAGING } from "@/lib/site-env";

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

function snapshot() {
  return cookieConsentFromHeader(document.cookie) ?? localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";
}

export function GoogleAnalytics() {
  const storedConsent = useSyncExternalStore(subscribe, snapshot, () => "");
  const consent = parseCookieConsent(storedConsent);
  const analyticsGranted = consent?.analytics === true;
  const pathname = usePathname();

  useEffect(() => {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
    window.gtag("consent", "update", googleConsentSignals(parseCookieConsent(storedConsent)));
  }, [storedConsent]);

  useEffect(() => {
    if (IS_STAGING || !analyticsGranted) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [analyticsGranted, pathname]);

  return null;
}
