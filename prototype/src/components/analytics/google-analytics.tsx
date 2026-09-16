"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { CONSENT_CHANGE_EVENT, CONSENT_STORAGE_KEY, googleConsentSignals, parseCookieConsent } from "@/lib/cookie-consent";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-D07763XPWC";

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
  return localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";
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
    if (!analyticsGranted) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [analyticsGranted, pathname]);

  if (!MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="genora-google-tag" strategy="afterInteractive">
        {`window.gtag('js',new Date());window.gtag('config','${MEASUREMENT_ID}',{send_page_view:false,anonymize_ip:true});`}
      </Script>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="afterInteractive" />
    </>
  );
}
