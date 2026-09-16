"use client";

import { LandingFeatureTiles } from "@/components/landing/landing-feature-tiles";
import { useLocale } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";
import { songLandingCopy } from "@/lib/i18n/copy/song-landing-copy";
import { ArrowRight, Mic2, Music2, Sparkles, Wallet } from "lucide-react";
import Image from "next/image";

const icons = [Sparkles, Music2, Mic2, Wallet];

export function SongsSection() {
  const { locale } = useLocale();
  const copy = songLandingCopy(locale);

  return (
    <section id="songs" className="scroll-mt-[60px] bg-bg py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/songs" className="mx-auto mb-4 block max-w-3xl rounded-2xl text-center outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{copy.eyebrow}</p>
          <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-text sm:text-4xl">{copy.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-steel sm:text-base">{copy.subtitle}</p>
        </Link>
        <div className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_30px_90px_-65px_color-mix(in_oklch,var(--accent)_65%,transparent)]">
          <div className="grid items-stretch lg:grid-cols-[1.12fr_0.88fr]">
            <div className="order-1 flex flex-col justify-center p-5 pb-6 sm:p-7 sm:pb-8 lg:p-8">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">
                <Music2 className="size-4" />
                {copy.badge}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">{copy.headline}</h3>
              <LandingFeatureTiles items={copy.items} icons={icons} />
              <Link href="/register" className="mt-5 inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white outline-none transition-colors hover:bg-[#3b8ef0] focus-visible:ring-2 focus-visible:ring-accent-brand/40">
                {copy.cta} <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="relative order-2 min-h-[200px] overflow-hidden bg-[#1a1020] sm:min-h-[240px] lg:min-h-full">
              <Image
                src="/landing/songs-hero-singer.jpg"
                alt={copy.imageAlt}
                fill
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="object-cover object-[center_18%]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1020]/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
