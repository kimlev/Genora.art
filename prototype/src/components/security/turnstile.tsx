"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { authUiCopy } from "@/lib/i18n/copy/auth-ui";
import { IS_STAGING } from "@/lib/site-env";
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const SITE_KEY = "0x4AAAAAAERBzz8W0mt9xYZD";

declare global {
  interface Window {
    turnstile?: {
      render: (target: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({
  action,
  resetKey,
  onToken,
  onError,
}: {
  action: "login" | "register" | "support";
  resetKey: number;
  onToken: (token: string | null) => void;
  onError?: () => void;
}) {
  const { locale } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const failCountRef = useRef(0);

  const renderWidget = useCallback(() => {
    if (IS_STAGING) return;
    if (!hostRef.current || !window.turnstile || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(hostRef.current, {
      sitekey: SITE_KEY,
      action,
      theme: "auto",
      size: "flexible",
      appearance: "always",
      retry: "auto",
      "refresh-expired": "auto",
      callback: (token: string) => {
        failCountRef.current = 0;
        onToken(token);
      },
      "expired-callback": () => onToken(null),
      "error-callback": () => {
        onToken(null);
        failCountRef.current += 1;
        if (failCountRef.current >= 2) onError?.();
      },
    });
  }, [action, onError, onToken]);

  useEffect(() => {
    if (IS_STAGING) {
      onToken("staging");
      return;
    }
    if (!widgetRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetRef.current);
    onToken(null);
  }, [onToken, resetKey]);

  useEffect(() => () => {
    if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
    widgetRef.current = null;
  }, []);

  if (IS_STAGING) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />
      <div ref={hostRef} className="min-h-[65px] w-full" aria-label={authUiCopy(locale).securityCheck} />
    </>
  );
}
