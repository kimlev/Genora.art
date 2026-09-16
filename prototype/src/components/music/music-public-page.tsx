"use client";

import { MusicGuideSections } from "@/components/music/music-guide-sections";
import { SongsPageLanding } from "@/components/music/songs-page-landing";
import { useLocale } from "@/components/providers/locale-provider";
import { musicStudioCopy } from "@/lib/i18n/copy/music-page";
import { useEffect } from "react";

export function MusicPublicPage() {
  const { locale } = useLocale();
  const copy = musicStudioCopy(locale);

  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <>
      <SongsPageLanding />
      <div id="music-guide" className="mx-auto max-w-6xl scroll-mt-[76px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{copy.guideEyebrow}</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-5xl">{copy.guideTitle}</h2>
          <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{copy.guideLead}</p>
        </div>
        <div className="mt-14">
          <MusicGuideSections />
        </div>
      </div>
    </>
  );
}
