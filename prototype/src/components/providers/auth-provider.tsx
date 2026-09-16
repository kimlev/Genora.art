"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { formatTokensAsCredits } from "@/lib/credits";
import { getLocaleOption, type Locale } from "@/lib/i18n";
import { authUiCopy } from "@/lib/i18n/copy/auth-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatarDataUrl?: string;
  timezone?: string;
  aiTone?: string;
  aiPreferences?: string;
  registrationCountry?: string;
  addressLine?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  detectedCountryCode?: string;
  detectedIpAddress?: string;
  balanceTokens: number;
  paidBalanceTokens?: number;
  balanceScaleVersion?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string, mode: "login" | "register", remember?: boolean, consents?: { termsAccepted: boolean; privacyAccepted: boolean }, turnstileToken?: string, locale?: Locale) => Promise<{ ok: boolean; pendingVerification?: boolean; pinRequired?: boolean; message?: string; error?: string }>;
  completePin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
  setBalanceTokens: (value: number) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const lastRefreshRef = useRef(0);
  const walletRefreshRef = useRef(0);
  const { locale: uiLocale } = useLocale();

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {
      const version = ++walletRefreshRef.current;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) return;
          const data = await response.json() as { user?: AuthUser | null };
          if (active && version === walletRefreshRef.current && data.user) {
            const wallet = data.user;
            setUser((current) => current && current.id === wallet.id ? { ...current, balanceTokens: wallet.balanceTokens, paidBalanceTokens: wallet.paidBalanceTokens } : current);
          }
        }).catch(() => undefined);
      }, 50);
    };
    window.addEventListener("genora-balance-changed", changed);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("genora-balance-changed", changed); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefreshRef.current < 60_000) return;
      lastRefreshRef.current = Date.now();
      const version = ++walletRefreshRef.current;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json() as { user?: AuthUser | null };
        if (active && version === walletRefreshRef.current) setUser(response.ok ? (data.user ?? null) : null);
      } catch {
        if (active && version === walletRefreshRef.current) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, mode: "login" | "register", remember = false, consents?: { termsAccepted: boolean; privacyAccepted: boolean }, turnstileToken?: string, locale?: Locale) => {
      try {
        const response = await fetch(`/api/auth/${mode}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            remember,
            ...consents,
            turnstileToken,
            locale,
            ref: typeof window !== "undefined" ? sessionStorage.getItem("ms-ref") : null,
            visitorKey: typeof window !== "undefined" ? localStorage.getItem("ms-visitor") : null,
          }),
        });
        const data = await response.json() as { user?: AuthUser; pendingVerification?: boolean; message?: string; error?: string; code?: string };
        if (response.ok && data.pendingVerification) return { ok: true, pendingVerification: true, message: data.message };
        if (data.code === "PIN_REQUIRED" || response.status === 428) return { ok: false, pinRequired: true, error: data.error };
        if (!response.ok || !data.user) return { ok: false, error: data.error ?? authUiCopy(uiLocale).signInFailed };
        setUser(data.user);
        return { ok: true };
      } catch {
        return { ok: false, error: authUiCopy(uiLocale).serverUnavailable };
      }
    },
    [uiLocale],
  );

  const completePin = useCallback(async (pin: string) => {
    try {
      const response = await fetch("/api/auth/pin/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !data.user) return { ok: false, error: data.error ?? authUiCopy(uiLocale).pinInvalid };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: authUiCopy(uiLocale).serverUnavailable };
    }
  }, [uiLocale]);

  const signOut = useCallback(async () => {
    ++walletRefreshRef.current;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (patch: Partial<AuthUser>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        const profilePatch = {
          name: patch.name,
          nickname: patch.nickname,
          avatarDataUrl: patch.avatarDataUrl,
          timezone: patch.timezone,
          aiTone: patch.aiTone,
          aiPreferences: patch.aiPreferences,
          registrationCountry: patch.registrationCountry,
          addressLine: patch.addressLine,
          city: patch.city,
          region: patch.region,
          postalCode: patch.postalCode,
        };
        void fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(profilePatch),
        }).then(async (response) => {
          if (!response.ok) return;
          const data = await response.json() as { user?: AuthUser };
          if (data.user) setUser((current) => current ? { ...current, ...data.user } : data.user ?? null);
        }).catch(() => undefined);
        return next;
      });
    },
    [],
  );
  const setBalanceTokens = useCallback((value: number) => {
    // Job results are snapshots and can predate other charges/refunds. Never
    // restore them into the wallet: read its current value, without any debit.
    if (Number.isFinite(value)) window.dispatchEvent(new Event("genora-balance-changed"));
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, completePin, signOut, updateUser, setBalanceTokens }),
    [completePin, ready, setBalanceTokens, signIn, signOut, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function formatTokens(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(getLocaleOption(locale).intl).format(amount);
}

export function formatCompactTokens(amount: number, locale: Locale): string {
  return formatTokensAsCredits(amount, getLocaleOption(locale).intl, "spend");
}
