"use client";

import { Link } from "@/components/ui/locale-link";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useSmoothScroll } from "@/components/providers/lenis-provider";
import {
  landingInteractiveCopy,
  landingMediaBadges,
  type LandingInteractiveCopy,
  type LandingMediaBadges,
} from "@/lib/i18n/copy/landing-interactive";
import { ArrowRight, Bot, ImageIcon, MessageSquare, Music2, Play, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { acquireScrollLock } from "@/lib/scroll-lock";

const singerVideo = "/landing/singer-alive.mp4";
const singerPoster = "/landing/songs-hero-singer.jpg";
const showcaseVideo = "/landing/genora-home-video.mp4";
const showcasePoster = "/landing/genora-showcase-first-frame.jpg";
const imageBefore = "/agents/anime-hero-before.jpg";
const imageAfter = "/agents/anime-hero-after.jpg";

type Navigate = (hash: string) => void;

function activateWithKeyboard(event: ReactKeyboardEvent, activate: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
}

type HeroCopy = LandingInteractiveCopy["hero"];

function HitsCard({ onNavigate, copy }: { onNavigate: Navigate; copy: HeroCopy }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = () => {
    void videoRef.current?.play().catch(() => undefined);
  };

  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <article
      tabIndex={0}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      onClick={() => onNavigate("#songs")}
      onKeyDown={(event) => activateWithKeyboard(event, () => onNavigate("#songs"))}
      role="link"
      className="group relative min-h-[230px] cursor-pointer overflow-hidden rounded-[26px] border border-white/15 bg-[#061321] text-white shadow-[0_22px_55px_-34px_rgba(7,34,59,0.9)] outline-none ring-offset-2 ring-offset-bg transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-accent-brand sm:col-span-5 lg:col-span-4"
    >
      <Image
        src={singerPoster}
        alt="Певица у студийного микрофона"
        fill
        priority
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 42vw, 100vw"
        className="object-cover object-[center_34%] transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0"
      />
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={singerPoster}
        className="absolute inset-0 size-full object-cover object-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100"
      >
        <source src={singerVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,12,22,0.12)_0%,rgba(3,12,22,0.18)_42%,rgba(3,12,22,0.88)_100%)]" />
      <div className="relative flex h-full min-h-[230px] flex-col justify-between p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[23px] font-bold tracking-[-0.02em]">{copy.hitsTitle}</h2>
          <span className="inline-flex size-10 items-center justify-center rounded-full border border-white/30 bg-black/20 backdrop-blur-sm transition-colors group-hover:bg-white group-hover:text-[#0b1723] group-focus:bg-white group-focus:text-[#0b1723]">
            <Music2 className="size-4.5" />
          </span>
        </div>
        <div>
          <p className="max-w-[260px] text-[15px] font-semibold leading-snug">{copy.hitsDescription}</p>
        </div>
      </div>
    </article>
  );
}

function ImagesCard({ onNavigate, copy, badges, title, description }: { onNavigate: Navigate; copy: HeroCopy; badges: LandingMediaBadges; title: string; description: string }) {
  return (
    <article
      tabIndex={0}
      onClick={() => onNavigate("#image-generation")}
      onKeyDown={(event) => activateWithKeyboard(event, () => onNavigate("#image-generation"))}
      role="link"
      className="genora-hero-card group relative min-h-[230px] cursor-pointer overflow-hidden rounded-[26px] border border-[#efd59f] bg-[linear-gradient(135deg,#fff7df_0%,#ffedc0_100%)] p-6 text-[#6b4d14] shadow-[0_22px_55px_-38px_rgba(171,116,13,0.55)] outline-none ring-offset-2 ring-offset-bg transition-[border-color,box-shadow] hover:border-[#dba33c] hover:shadow-[0_26px_70px_-35px_rgba(191,126,13,0.62)] focus-visible:ring-2 focus-visible:ring-[#d39b31] sm:col-span-7 lg:col-span-8"
    >
      <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-white/35 blur-2xl transition-transform duration-700 group-hover:translate-x-16 group-hover:translate-y-8 group-focus:translate-x-16 group-focus:translate-y-8" />
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-[#FF6F00]/12 transition-transform duration-700 ease-out group-hover:-translate-x-10 group-hover:translate-y-7 group-focus:-translate-x-10 group-focus:translate-y-7" />
      <span aria-hidden className="pointer-events-none absolute -bottom-12 left-[34%] size-24 rounded-full bg-white/55 transition-transform duration-700 ease-out group-hover:translate-x-14 group-hover:-translate-y-8 group-focus:translate-x-14 group-focus:-translate-y-8" />
      <div className="relative grid h-full min-h-[180px] grid-cols-[minmax(0,1fr)_142px] items-center gap-5 sm:grid-cols-[minmax(0,1fr)_178px]">
        <div className="self-center">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#FF6F00] text-white shadow-[0_12px_28px_-12px_rgba(233,111,50,0.8)]">
            <ImageIcon className="size-5" />
          </span>
          <h2 className="mt-4 text-[22px] font-bold tracking-[-0.02em]">{title}</h2>
          <p className="mt-2 text-[14px] font-semibold leading-snug text-[#78571a]">{description}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8f7138]">{copy.imagesExtra}</p>
        </div>

        <div className="relative h-[182px] overflow-hidden rounded-[20px] border border-white/75 bg-white shadow-[0_18px_36px_-24px_rgba(71,47,9,0.65)]">
          <Image src={imageBefore} alt="Исходная фотография" fill sizes="180px" className="object-cover" />
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden border-l border-white/80 transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:w-full group-focus:w-full">
            <Image src={imageAfter} alt="Результат обработки нейросетью" fill sizes="180px" className="object-cover object-right" />
          </div>
          <div className="absolute inset-x-3 top-3 flex justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-white drop-shadow-md">
            <span className="rounded-full bg-black/38 px-2 py-1 backdrop-blur-sm">{badges.photo}</span>
            <span className="rounded-full bg-[#FF6F00]/85 px-2 py-1 backdrop-blur-sm">{badges.ai}</span>
          </div>
          <Sparkles className="absolute bottom-3 right-3 size-5 text-white opacity-0 drop-shadow-md transition-all duration-500 group-hover:rotate-12 group-hover:opacity-100 group-focus:rotate-12 group-focus:opacity-100" />
        </div>
      </div>
    </article>
  );
}

function TextCard({ onNavigate, copy, title }: { onNavigate: Navigate; copy: HeroCopy; title: string }) {
  return (
    <article
      tabIndex={0}
      onClick={() => onNavigate("#demo")}
      onKeyDown={(event) => activateWithKeyboard(event, () => onNavigate("#demo"))}
      role="link"
      className="genora-hero-card group relative min-h-[230px] cursor-pointer overflow-hidden rounded-[26px] border border-[#9ad5ea] bg-[linear-gradient(135deg,#dff5ff_0%,#bce8f8_100%)] p-6 text-[#163d58] shadow-[0_22px_55px_-38px_rgba(23,127,170,0.6)] outline-none ring-offset-2 ring-offset-bg transition-[border-color,box-shadow] hover:border-[#55b9df] hover:shadow-[0_26px_70px_-35px_rgba(23,127,170,0.58)] focus-visible:ring-2 focus-visible:ring-[#36a7d4] sm:col-span-6 lg:col-span-5"
    >
      <div className="relative flex min-h-[180px] items-center justify-center transition-all duration-300 group-hover:-translate-y-3 group-hover:opacity-0 group-focus-visible:-translate-y-3 group-focus-visible:opacity-0">
        <div className="text-center">
          <span className="genora-card-accent mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-white text-[#347cff] shadow-[0_12px_28px_-15px_rgba(36,111,236,0.85)]">
            <MessageSquare className="size-5" />
          </span>
          <h2 className="genora-card-accent mt-4 text-[22px] font-bold text-[#347cff]">{title}</h2>
          <p className="mt-2 text-[14px] font-semibold">{copy.textSubtitle}</p>
          <p className="mt-1 text-[12px] text-[#4f7186]">{copy.textExtra}</p>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col justify-center gap-2.5 p-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
        <div className="genora-card-accent-bg translate-y-2 self-end rounded-[16px_16px_4px_16px] bg-[#347cff] px-3.5 py-2 text-[12px] font-medium text-white opacity-0 shadow-sm transition-all delay-75 duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {copy.textQuestion}
        </div>
        <div className="flex translate-y-2 items-start gap-2 opacity-0 transition-all delay-300 duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <span className="genora-card-accent inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[#347cff] shadow-sm"><Bot className="size-3.5" /></span>
          <div className="rounded-[4px_16px_16px_16px] bg-white/90 px-3.5 py-2 text-[12px] leading-relaxed text-[#25455b] shadow-sm">
            {copy.textAnswer}
          </div>
        </div>
      </div>
    </article>
  );
}

function VideoCard({ onOpen, onNavigate, copy }: { onOpen: () => void; onNavigate: Navigate; copy: HeroCopy }) {
  return (
    <article
      tabIndex={0}
      onClick={() => onNavigate("#video")}
      onKeyDown={(event) => activateWithKeyboard(event, () => onNavigate("#video"))}
      role="link"
      className="genora-hero-card group relative min-h-[230px] cursor-pointer overflow-hidden rounded-[26px] border border-[#8ed4bb] bg-[linear-gradient(135deg,#e8faf3_0%,#ccefe3_100%)] p-6 text-left text-[#145f4b] shadow-[0_22px_55px_-38px_rgba(18,163,122,0.55)] outline-none ring-offset-2 ring-offset-bg transition-[border-color,box-shadow] hover:border-[#12a37a] hover:shadow-[0_26px_70px_-35px_rgba(18,163,122,0.58)] focus-visible:ring-2 focus-visible:ring-[#12a37a] sm:col-span-6 lg:col-span-7"
      aria-label={copy.videoNav}
    >
      <span aria-hidden className="genora-card-decoration pointer-events-none absolute -left-14 -top-16 size-40 rounded-full bg-[#12a37a]/13 transition-transform duration-700 ease-out group-hover:translate-x-12 group-hover:translate-y-8 group-focus:translate-x-12 group-focus:translate-y-8" />
      <span aria-hidden className="pointer-events-none absolute -bottom-12 left-[28%] size-28 rounded-full bg-white/58 transition-transform duration-700 ease-out group-hover:translate-x-16 group-hover:-translate-y-7 group-focus:translate-x-16 group-focus:-translate-y-7" />
      <div className="relative z-10 max-w-[52%] transition-all duration-300 group-hover:-translate-x-3 group-hover:opacity-0 group-focus:-translate-x-3 group-focus:opacity-0">
        <span className="genora-card-accent inline-flex size-11 items-center justify-center rounded-2xl bg-white/80 text-[#0d7a5b] shadow-[0_12px_28px_-16px_rgba(18,163,122,0.72)]">
          <Play className="size-5 fill-current" />
        </span>
        <h2 className="genora-card-accent mt-4 text-[22px] font-bold tracking-[-0.02em] text-[#0d7a5b]">{copy.videoTitle}</h2>
        <p className="mt-2 text-[14px] font-semibold leading-snug">{copy.videoDescription}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#4d7d6f]">{copy.videoExtra}</p>
      </div>

      <div className="absolute bottom-4 right-4 top-4 w-[42%] overflow-hidden rounded-[20px] border border-white/80 bg-[#12202c] shadow-[0_18px_36px_-24px_rgba(78,35,32,0.7)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:inset-0 group-hover:size-full group-hover:rounded-[25px] group-focus:inset-0 group-focus:size-full group-focus:rounded-[25px]">
        <Image src={showcasePoster} alt="Превью видео" fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/38 group-focus:bg-black/38" />
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }} className="absolute left-1/2 top-1/2 inline-flex size-14 -translate-x-1/2 -translate-y-1/2 scale-100 items-center justify-center rounded-full border border-white/65 bg-white/92 text-[#1a2732] opacity-100 shadow-xl backdrop-blur transition-all duration-300 sm:scale-75 sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100 sm:group-focus-visible:scale-100 sm:group-focus-visible:opacity-100" aria-label={copy.openFullscreen}>
          <Play className="ms-0.5 size-5 fill-current" />
        </button>
      </div>
    </article>
  );
}

function VideoPreviewDialog({ onClose, copy }: { onClose: () => void; copy: HeroCopy }) {
  useEffect(() => {
    const releaseScrollLock = acquireScrollLock();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      releaseScrollLock();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111d]/92 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={copy.openFullscreen}>
      <button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label={copy.close} />
      <div className="relative z-10 aspect-video w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/20 bg-black shadow-2xl">
        <video autoPlay controls playsInline preload="auto" poster={showcasePoster} className="size-full object-contain">
          <source src={showcaseVideo} type="video/mp4" />
        </video>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70" aria-label={copy.close}>
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function HeroShowcase() {
  const t = useT();
  const { locale } = useLocale();
  const interactiveCopy = landingInteractiveCopy(locale);
  const mediaBadges = landingMediaBadges(locale);
  const { scrollToHash } = useSmoothScroll();
  const [videoOpen, setVideoOpen] = useState(false);

  const navigate: Navigate = (hash) => {
    window.history.replaceState(null, "", hash);
    scrollToHash(hash);
  };

  return (
    <section className="relative min-h-[calc(100svh-60px)] overflow-hidden bg-bg px-4 py-8 sm:px-7 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:19px_19px]" />
      <div className="relative mx-auto w-full max-w-[1080px]">
        <div className="max-w-[820px]">
          <h1 className="text-[clamp(2.1rem,4.6vw,4.35rem)] font-bold leading-[1.02] tracking-[-0.045em] text-text">
            {t.hero.titleBefore}<span className="text-accent-brand">{t.hero.titleAccent}</span>{t.hero.titleAfter}
          </h1>
          <p className="mt-4 text-[clamp(1rem,1.8vw,1.35rem)] font-medium text-steel">{interactiveCopy.hero.subtitle}</p>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-12 lg:gap-5" aria-label="Возможности Genora.art">
          <HitsCard onNavigate={navigate} copy={interactiveCopy.hero} />
          <ImagesCard onNavigate={navigate} copy={interactiveCopy.hero} badges={mediaBadges} title={t.hero.entries.images.title} description={t.hero.entries.images.description} />
          <TextCard onNavigate={navigate} copy={interactiveCopy.hero} title={t.hero.entries.text.title} />
          <VideoCard onOpen={() => setVideoOpen(true)} onNavigate={navigate} copy={interactiveCopy.hero} />
        </section>

        <div className="mt-7 flex justify-center">
          <Link href="/register" className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#FF6F00] px-8 text-[16px] font-semibold text-white shadow-[0_18px_36px_-18px_rgba(255,111,0,0.9)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-[#dc5f00] hover:shadow-[0_22px_42px_-17px_rgba(255,111,0,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
            {t.hero.ctaPrimary}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {videoOpen ? <VideoPreviewDialog onClose={() => setVideoOpen(false)} copy={interactiveCopy.hero} /> : null}
    </section>
  );
}
