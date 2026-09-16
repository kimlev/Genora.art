"use client";

import { ProviderLogo } from "@/components/chat/provider-logo";
import { useLocale } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";
import { songsPageLandingCopy } from "@/lib/i18n/copy/songs-page-landing-copy";
import {
  ArrowRight,
  Clapperboard,
  Heart,
  Mic2,
  Music2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TAG_STYLES = [
  "border-[#9ec9ff] bg-[#eef6ff] text-[#1d6fd4]",
  "border-[#d4b3f0] bg-[#f6edff] text-[#6d28d9]",
  "border-[#f3c19a] bg-[#fff3e8] text-[#c24e16]",
  "border-[#f2c4d4] bg-[#fff0f5] text-[#b42364]",
  "border-[#8ed4bb] bg-[#e8faf3] text-[#0d7a5b]",
] as const;

const TAG_ICONS: LucideIcon[] = [Mic2, Music2, WandSparkles, Heart, Sparkles];
const REASON_ICONS: LucideIcon[] = [WandSparkles, Mic2, Sparkles, Music2, Heart];
const REASON_TONES = [
  "border-[#d4b3f0] bg-[linear-gradient(180deg,#f6edff_0%,#ffffff_70%)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(109,40,217,0.45)]",
  "border-[#9ec9ff] bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_70%)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(29,111,212,0.4)]",
  "border-[#8ed4bb] bg-[linear-gradient(180deg,#e8faf3_0%,#ffffff_70%)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(13,122,91,0.4)]",
  "border-[#f3c19a] bg-[linear-gradient(180deg,#fff3e8_0%,#ffffff_70%)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(194,78,22,0.4)]",
  "border-[#c4b5a0] bg-[linear-gradient(180deg,#f6efe6_0%,#ffffff_70%)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_rgba(122,90,58,0.35)]",
] as const;

const STEP_TONES = [
  "border-[#b7d4ff] bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_72%)] hover:-translate-y-1 hover:border-[#7eb4ff] hover:shadow-[0_20px_40px_-24px_rgba(29,111,212,0.45)]",
  "border-[#f0c8a8] bg-[linear-gradient(180deg,#fff4ea_0%,#ffffff_72%)] hover:-translate-y-1 hover:border-[#e8a56e] hover:shadow-[0_20px_40px_-24px_rgba(194,78,22,0.4)]",
  "border-[#b8e0d0] bg-[linear-gradient(180deg,#eefaf4_0%,#ffffff_72%)] hover:-translate-y-1 hover:border-[#7ecfb0] hover:shadow-[0_20px_40px_-24px_rgba(13,122,91,0.4)]",
] as const;

const STEP_CHIP_TONES = [
  "border-[#d4b3f0] bg-[#f3e8ff] text-[#3b1764]",
  "border-[#9ec9ff] bg-[#e4f1ff] text-[#0b3d7a]",
  "border-[#f3c19a] bg-[#ffe8d4] text-[#6a2e0a]",
  "border-[#8ed4bb] bg-[#dcf6ec] text-[#0a4a36]",
] as const;

const EXTRA_ITEM_TONES = [
  "border-[#9ec9ff] bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_74%)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_rgba(29,111,212,0.4)]",
  "border-[#b8e0d0] bg-[linear-gradient(180deg,#eefaf4_0%,#ffffff_74%)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_rgba(13,122,91,0.4)]",
  "border-[#d4b3f0] bg-[linear-gradient(180deg,#f6edff_0%,#ffffff_74%)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_rgba(109,40,217,0.4)]",
] as const;

const EQ_BARS = [28, 46, 34, 62, 40, 72, 38, 54, 30, 48, 66, 36];
const WAVE_BARS = [22, 40, 28, 70, 48, 86, 36, 64, 30, 78, 44, 58, 26, 68, 42];

function highlightPhrase(text: string, phrase: string): ReactNode {
  const index = text.toLocaleLowerCase().indexOf(phrase.toLocaleLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#1d6fd4]">{text.slice(index, index + phrase.length)}</span>
      {text.slice(index + phrase.length)}
    </>
  );
}

function Equalizer({ bars, className }: { bars: number[]; className?: string }) {
  return (
    <div className={`flex h-full items-end justify-center gap-1 px-1 ${className ?? ""}`} aria-hidden="true">
      {bars.map((height, bar) => (
        <span
          key={bar}
          className="songs-eq-bar w-1.5 origin-bottom rounded-full bg-[#FF6F00] sm:w-2"
          style={{
            height: `${height}%`,
            animationDelay: `${bar * 90}ms`,
            animationDuration: `${720 + (bar % 4) * 140}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function SongsPageLanding() {
  const { locale } = useLocale();
  const copy = songsPageLandingCopy(locale);

  return (
    <div className="bg-bg">
      <style>{`
        @keyframes songs-eq {
          0%, 100% { transform: scaleY(0.32); }
          50% { transform: scaleY(1); }
        }
        .songs-eq-bar { animation: songs-eq 900ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .songs-eq-bar { animation: none !important; }
        }
      `}</style>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(74,158,255,0.16),transparent_42%),radial-gradient(circle_at_88%_80%,rgba(139,92,246,0.12),transparent_36%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{copy.heroEyebrow}</p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-text sm:text-5xl">{copy.heroTitle}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-steel sm:text-lg">{copy.heroLead}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/music"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white transition-colors hover:bg-[#3b8ef0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40"
              >
                <Music2 className="size-4" />
                {copy.heroCta}
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6d28d9] transition-colors hover:text-[#4c1d95]">
                {copy.heroSecondary} <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {copy.tags.map((tag, index) => {
                const Icon = TAG_ICONS[index] ?? Music2;
                return (
                  <span key={tag} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${TAG_STYLES[index % TAG_STYLES.length]}`}>
                    <Icon className="size-3.5" />
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[32px] border border-border bg-[#1a1020] shadow-[0_30px_90px_-60px_rgba(30,80,160,0.55)] sm:max-w-none">
            <Image src="/landing/songs-hero-singer.jpg" alt={copy.heroTitle} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover object-[center_18%]" priority />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1020]/55 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-text sm:text-4xl">{copy.stepsTitle}</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-steel">{copy.stepsLead}</p>
        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-3">
          {copy.steps.map((step, index) => (
            <article
              key={step.title}
              className={`flex h-full flex-col rounded-[28px] border p-5 shadow-[0_18px_40px_-32px_rgba(30,80,160,0.28)] transition-all duration-300 ${STEP_TONES[index % STEP_TONES.length]}`}
            >
              <p className="font-serif text-4xl font-semibold text-text/20">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-xl font-semibold text-text">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel">{step.text}</p>
              <div className="mt-auto flex min-h-[8.75rem] items-center rounded-2xl border border-white/70 bg-white/70 p-4">
                {index === 0 ? (
                  <p className="text-sm italic leading-relaxed text-steel">{step.hint}</p>
                ) : null}
                {index === 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {(step.chips ?? []).map((chip, chipIndex) => (
                      <span
                        key={`${chip.type}-${chip.value}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STEP_CHIP_TONES[chipIndex % STEP_CHIP_TONES.length]}`}
                      >
                        <span>{chip.type}</span>
                        <span className="opacity-50">·</span>
                        <span>{chip.value}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                {index === 2 ? <Equalizer bars={EQ_BARS} className="h-16 w-full" /> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-mist/35">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-text sm:text-4xl">{copy.reasonsTitle}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-steel">{copy.reasonsLead}</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {copy.reasons.map((reason, index) => {
              const Icon = REASON_ICONS[index] ?? Sparkles;
              return (
                <article key={reason.title} className={`flex h-full min-h-[16rem] flex-col rounded-[24px] border p-4 transition-all duration-300 ${REASON_TONES[index % REASON_TONES.length]}`}>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/80 text-text shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-text">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-steel">{reason.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="overflow-hidden rounded-[32px] border border-border bg-surface shadow-[0_30px_90px_-65px_rgba(30,80,160,0.45)]">
          <div className="grid items-stretch lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-6 sm:p-10">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">
                <Clapperboard className="size-4" />
                {copy.extraEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{highlightPhrase(copy.extraTitle, copy.extraHighlight)}</h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-steel">{highlightPhrase(copy.extraLead, copy.extraHighlight)}</p>
              <div className="mt-6 grid items-stretch gap-3 sm:grid-cols-3">
                {copy.extraItems.map((item, index) => (
                  <article
                    key={item.title}
                    className={`flex h-full min-h-[9.5rem] flex-col rounded-2xl border p-3.5 transition-all duration-300 ${EXTRA_ITEM_TONES[index % EXTRA_ITEM_TONES.length]}`}
                  >
                    <h3 className="text-sm font-semibold text-text">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-steel">{item.text}</p>
                  </article>
                ))}
              </div>
              <Link
                href="/music"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white transition-colors hover:bg-[#3b8ef0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40"
              >
                {copy.extraCta} <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="relative min-h-[320px] overflow-hidden bg-[#0f1b2e] p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(74,158,255,0.28),transparent_46%)]" />
              <div className="relative flex h-full flex-col items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="flex w-full flex-col items-center gap-2 text-white">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <ProviderLogo provider="Sonilo" className="size-8" />
                    {copy.extraSpecs.model}: {copy.extraSpecs.modelName}
                  </span>
                  <p className="text-xs text-white/75">{copy.extraSpecs.file}</p>
                  <p className="text-xs text-white/75">{copy.extraSpecs.duration}</p>
                  <p className="text-xs text-white/75">{copy.extraSpecs.format}</p>
                </div>
                <Equalizer bars={WAVE_BARS} className="h-28 w-full max-w-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
