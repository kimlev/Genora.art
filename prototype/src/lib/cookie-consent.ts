export const CONSENT_STORAGE_KEY = "genora-cookie-consent-v2";
export const CONSENT_COOKIE_NAME = "genora_cookie_consent_v2";
export const CONSENT_CHANGE_EVENT = "genora-cookie-consent-change";
export const CONSENT_OPEN_EVENT = "genora-cookie-consent-open";

export type CookieConsentPreferences = {
  version: 2;
  analytics: boolean;
  advertising: boolean;
};

export const REJECTED_CONSENT: CookieConsentPreferences = {
  version: 2,
  analytics: false,
  advertising: false,
};

export function parseCookieConsent(raw: string | null): CookieConsentPreferences | null {
  if (!raw) return null;
  if (raw === "accepted") return { ...REJECTED_CONSENT, analytics: true };
  if (raw === "rejected") return REJECTED_CONSENT;
  try {
    const value = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    if (value.version !== 2 || typeof value.analytics !== "boolean" || typeof value.advertising !== "boolean") return null;
    return { version: 2, analytics: value.analytics, advertising: value.advertising };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(value: CookieConsentPreferences): string {
  return JSON.stringify(value);
}

export function cookieConsentFromHeader(cookieHeader: string): string | null {
  for (const item of cookieHeader.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === CONSENT_COOKIE_NAME) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export function consentCookie(value: CookieConsentPreferences, hostname: string): string {
  const domain = hostname === "genora.art" || hostname.endsWith(".genora.art") ? "; Domain=.genora.art" : "";
  return `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serializeCookieConsent(value))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure${domain}`;
}

export function googleConsentSignals(value: CookieConsentPreferences | null) {
  const analytics = value?.analytics === true ? "granted" : "denied";
  const advertising = value?.advertising === true ? "granted" : "denied";
  return {
    analytics_storage: analytics,
    ad_storage: advertising,
    ad_user_data: advertising,
    ad_personalization: advertising,
  } as const;
}

export const GOOGLE_CONSENT_BOOTSTRAP = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);try{var raw=localStorage.getItem('${CONSENT_STORAGE_KEY}');if(!raw){var legacy=localStorage.getItem('genora-cookie-consent');if(legacy)raw=legacy}if(!raw){var match=document.cookie.match(/(?:^|;\\s*)${CONSENT_COOKIE_NAME}=([^;]*)/);if(match)raw=decodeURIComponent(match[1])}var p=null;if(raw==='accepted')p={analytics:true,advertising:false};else if(raw==='rejected')p={analytics:false,advertising:false};else if(raw){var parsed=JSON.parse(raw);if(parsed.version===2)p=parsed}if(p)gtag('consent','update',{analytics_storage:p.analytics?'granted':'denied',ad_storage:p.advertising?'granted':'denied',ad_user_data:p.advertising?'granted':'denied',ad_personalization:p.advertising?'granted':'denied'})}catch(e){}`;
