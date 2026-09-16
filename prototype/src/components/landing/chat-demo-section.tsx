"use client";

import { useLocale, useT } from "@/components/providers/locale-provider";
import { landingInteractiveCopy, type LandingInteractiveCopy } from "@/lib/i18n/copy/landing-interactive";
import { Bot, BrainCircuit, Layers, Send, Sparkles, Swords, Zap } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const BULLET_ICONS = [Sparkles, Layers, Zap] as const;
const ROTATE_MS = 4200;
const PREVIEW_COUNT = 3;

export function ChatDemoSection() {
  const t = useT();
  const { locale } = useLocale();
  const interactiveCopy = landingInteractiveCopy(locale);
  const reduceMotion = useReducedMotion();
  const heroPanel = t.showcase.panels[0];
  const [phoneIndex, setPhoneIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const visiblePhoneIndex = hoveredIndex ?? phoneIndex;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || !inView || hoveredIndex !== null) return;

    const timer = window.setInterval(() => {
      setPhoneIndex((prev) => (prev + 1) % PREVIEW_COUNT);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [hoveredIndex, reduceMotion, inView]);

  if (!heroPanel) return null;

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="scroll-mt-[60px] border-t border-border bg-bg"
    >
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-8 py-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto grid w-full max-w-[820px] items-center gap-10 md:grid-cols-[minmax(0,1fr)_250px] md:gap-14 lg:gap-16">
          <div className="max-w-[400px] justify-self-center md:justify-self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-brand">
              {heroPanel.eyebrow}
            </p>
            <h2 className="mt-3 text-[2.35rem] font-bold leading-[1.05] tracking-tight text-text sm:text-[2.75rem]">
              {heroPanel.headline}
              <br />
              <span className="text-accent-brand">{heroPanel.headlineAccent}</span>
            </h2>
            <ul className="mt-7 space-y-3.5">
              {interactiveCopy.showcase.bullets.map((bullet, index) => {
                const Icon = BULLET_ICONS[index % BULLET_ICONS.length];
                return (
                  <li
                    key={`hero-b-${index}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setPhoneIndex(0);
                    }}
                    className="list-none"
                  >
                    <button
                      type="button"
                      onFocus={() => setHoveredIndex(index)}
                      onBlur={() => setHoveredIndex(null)}
                      onClick={() => setPhoneIndex(index)}
                      className={`flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left text-[15px] leading-snug text-text transition-colors ${visiblePhoneIndex === index ? "bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))]" : "hover:bg-mist/60"}`}
                    >
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-accent-brand">
                        <Icon className="size-3.5" />
                      </span>
                      {bullet}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="w-full max-w-[250px] justify-self-center md:justify-self-end">
            <PhoneMock
              brand={t.brand}
              online={t.showcase.online}
              previewIndex={visiblePhoneIndex}
              copy={interactiveCopy.showcase}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMock({
  brand,
  online,
  previewIndex,
  copy,
}: {
  brand: string;
  online: string;
  previewIndex: number;
  copy: LandingInteractiveCopy["showcase"];
}) {
  return (
    <div className="relative mx-auto aspect-[9/17.5] w-full max-w-[250px] overflow-hidden rounded-[2rem] border border-[#1a1d27] bg-[#0a0f1e] shadow-[0_28px_80px_-28px_rgba(15,23,42,0.55)] ring-1 ring-black/10">
      <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
        <div className="h-5 w-24 rounded-full bg-black/80" />
      </div>
      <div className="flex h-full flex-col px-3.5 pb-3.5 pt-9">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#FF6F00] text-sm font-bold text-white">
            A
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">{brand}</p>
            <p className="text-[11px] text-[#FF6F00]">{online}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div key={previewIndex} className="space-y-3">
              {previewIndex === 0 ? (
                <div className="mx-auto w-full max-w-[190px] overflow-hidden rounded-2xl border border-white/10 bg-[#151b2b]">
                  <div className="relative h-[200px] overflow-hidden bg-[#dcd4ff]">
                    <Image src="/agents/thumbs/video-promt.webp" alt="VideoPromt" fill sizes="190px" className="object-contain" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-2 inline-flex size-7 items-center justify-center rounded-lg bg-[#FF6F00] text-white"><Bot className="size-3.5" /></span>
                  </div>
                  <div className="p-3">
                    <p className="text-[14px] font-semibold text-white">VideoPromt</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#aeb8ca]">
                      {copy.agentDescription}
                    </p>
                  </div>
                </div>
              ) : null}

              {previewIndex === 1 ? (
                <div className="space-y-2.5">
                  <div className="ms-auto max-w-[82%] rounded-2xl rounded-tr-md bg-[#FF6F00] px-3 py-2.5 text-[12px] leading-relaxed text-white">
                    {copy.memoryQuestion}
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#25304a] text-[#6bb1ff]"><BrainCircuit className="size-3.5" /></span>
                    <div className="rounded-2xl rounded-tl-md bg-[#1a1d27] px-3 py-2.5 text-[11px] leading-relaxed text-[#e8edf5]">
                      {copy.memoryAnswer}
                    </div>
                  </div>
                </div>
              ) : null}

              {previewIndex === 2 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 rounded-xl bg-[#202842] px-3 py-2 text-[12px] font-semibold text-white">
                    <Swords className="size-4 text-[#6bb1ff]" />
                    {copy.battleTitle}
                  </div>
                  <div className="ms-auto max-w-[88%] rounded-2xl rounded-tr-md bg-[#FF6F00] px-3 py-2 text-[11px] text-white">
                    {copy.battlePrompt}
                  </div>
                  <div className="rounded-xl border border-[#5867a2]/35 bg-[#171d30] p-2.5">
                    <p className="text-[10px] font-semibold text-[#8dc3ff]">GPT</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#dce4f1]">{copy.battleAnswerA}</p>
                  </div>
                  <div className="rounded-xl border border-[#64a78f]/35 bg-[#14251f] p-2.5">
                    <p className="text-[10px] font-semibold text-[#78d5b1]">Claude</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#dcefe8]">{copy.battleAnswerB}</p>
                  </div>
                </div>
              ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-[#16162a] px-3 py-2">
          <span className="flex-1 truncate text-[12px] text-[#6b7a8d]">
            {copy.placeholder}
          </span>
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#FF6F00] text-white">
            <Send className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
