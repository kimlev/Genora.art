"use client";

import { useT } from "@/components/providers/locale-provider";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { usePublicContactEmail } from "@/components/layout/use-public-contact-email";
import { CONSENT_OPEN_EVENT } from "@/lib/cookie-consent";

const productLinks = [
  { href: "/models", labelKey: "models" as const },
  { href: "/image-examples", labelKey: "images" as const },
  { href: "/video-examples", labelKey: "video" as const },
  { href: "/songs", labelKey: "music" as const },
  { href: "/pricing", labelKey: "prices" as const },
];

const companyLinks = [
  { href: "/about", labelKey: "about" as const },
  { href: "/support", labelKey: "support" as const },
];

const discoveryLinks = [
  { href: "/blog", labelKey: "blog" as const },
  { href: "/rating", labelKey: "rating" as const },
  { href: "/agents", labelKey: "agents" as const },
];

const footerLegalLinks = [
  { href: "/legal/terms", labelKey: "terms" as const },
  { href: "/legal/privacy", labelKey: "privacy" as const },
  { href: "/legal/cookies", labelKey: "cookies" as const },
  { href: "/legal/terms", labelKey: "allDocuments" as const },
];

export function SiteFooter() {
  const t = useT();
  const contactEmail = usePublicContactEmail();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 space-y-4 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandWordmark className="text-base" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-steel">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-text">
              {t.footer.product}
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href + link.labelKey}>
                  <Link
                    href={link.href}
                    className="text-sm text-steel transition-colors hover:text-text"
                  >
                    {t.footer.links[link.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-text">{t.footer.materials}</h3>
            <ul className="space-y-2">
              {discoveryLinks.map((link) => (
                <li key={link.href + link.labelKey}>
                  <Link href={link.href} className="text-sm text-steel transition-colors hover:text-text">
                    {t.footer.links[link.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-text">
              {t.footer.company}
            </h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href + link.labelKey}>
                  <Link
                    href={link.href}
                    className="text-sm text-steel transition-colors hover:text-text"
                  >
                    {t.footer.links[link.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-text">
              {t.footer.documentation}
            </h3>
            <ul className="space-y-2">
              {footerLegalLinks.map((document) => (
                <li key={`${document.href}-${document.labelKey}`}>
                  <Link
                    href={document.href}
                    className="text-sm text-steel transition-colors hover:text-text"
                  >
                    {t.footer.links[document.labelKey]}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="text-sm text-steel transition-colors hover:text-text"
                  onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
                >
                  {t.legal.consent.settings ?? t.legal.consent.dialogLabel}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-1.5 border-t border-border pt-7 text-center text-sm leading-relaxed text-steel">
          <p>Operated by <strong className="font-semibold text-text">ELVARON LIMITED</strong> (Registration No. <strong className="font-semibold text-text">79402144</strong>)</p>
          <p>14/F, China Building, 29 Queen&apos;s Road Central, Central, Hong Kong</p>
          <p>Email: <a href={`mailto:${contactEmail}`} className="font-semibold text-[#FF6F00] underline underline-offset-4">{contactEmail}</a></p>
          <p>{t.footer.copyrightFull}</p>
          <div className="pt-5" aria-label={t.footer.securePayment}>
            <p className="mb-3 text-xs font-medium text-steel">{t.footer.securePayment}</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <PaymentTrustMark label="Visa">
                <span className="text-lg font-black italic tracking-[-0.08em] text-[#1434CB]">VISA</span>
              </PaymentTrustMark>
              <PaymentTrustMark label="Mastercard">
                <span className="relative mr-1 inline-flex h-5 w-8 items-center">
                  <span className="absolute left-0 size-5 rounded-full bg-[#EB001B]" />
                  <span className="absolute right-0 size-5 rounded-full bg-[#F79E1B] opacity-90" />
                </span>
                <span className="font-semibold tracking-tight text-text">mastercard</span>
              </PaymentTrustMark>
              <PaymentTrustMark label="PCI DSS">
                <ShieldCheck className="size-5 text-emerald-600" />
                <span className="font-bold text-text">PCI DSS</span>
              </PaymentTrustMark>
              <PaymentTrustMark label="Google Pay">
                <span className="text-base font-bold"><span className="text-[#4285F4]">G</span><span className="text-text"> Pay</span></span>
              </PaymentTrustMark>
              <PaymentTrustMark label="Apple Pay">
                <span className="text-xl leading-none text-text"></span>
                <span className="font-semibold text-text">Pay</span>
              </PaymentTrustMark>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function PaymentTrustMark({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-10 min-w-[106px] items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-3 text-xs shadow-sm"
    >
      {children}
    </span>
  );
}
