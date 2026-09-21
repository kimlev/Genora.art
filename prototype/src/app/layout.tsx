import { SiteShell } from "@/components/layout/site-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { getLocaleOption } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/locale-from-request";
import { LOCALE_COOKIE, LOCALE_HEADER, SITE_NAME, seoCopy, siteJsonLd } from "@/lib/seo";
import { IS_STAGING, publicSiteUrl } from "@/lib/site-env";
import { GOOGLE_CONSENT_BOOTSTRAP } from "@/lib/cookie-consent";
import { isAdminHostname, requestHostname } from "@/lib/admin-host";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

const defaultCopy = seoCopy("/", "ru");
const GOOGLE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-D07763XPWC";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl("/")),
  title: defaultCopy.title,
  description: defaultCopy.description,
  robots: {
    index: !IS_STAGING,
    follow: !IS_STAGING,
  },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: SITE_NAME,
    title: defaultCopy.title,
    description: defaultCopy.description,
    url: publicSiteUrl("/"),
    images: [{ url: "/favicon/genora-icon.png?v=2", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultCopy.title,
    description: defaultCopy.description,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Genora.art", statusBarStyle: "black-translucent" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const headersList = await headers();
  const cookieStore = await cookies();
  const isAdminHost = isAdminHostname(requestHostname(
    headersList.get("x-forwarded-host"),
    headersList.get("host"),
  ));
  const locale = resolveRequestLocale({
    appHeader: headersList.get(LOCALE_HEADER),
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headersList.get("accept-language"),
  });
  const option = getLocaleOption(locale);

  return (
    <html
      lang={option.code}
      dir={option.rtl ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_CONSENT_BOOTSTRAP }} />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_MEASUREMENT_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: `gtag('js',new Date());gtag('config','${GOOGLE_MEASUREMENT_ID}',{send_page_view:false,anonymize_ip:true});` }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(locale)) }}
        />
        <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
          <AppProviders initialLocale={locale}>
            <SiteShell isAdminHost={isAdminHost}>{children}</SiteShell>
          </AppProviders>
        </div>
      </body>
    </html>
  );
}
