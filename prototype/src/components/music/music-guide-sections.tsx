"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";
import { MUSIC_GUIDE_SECTIONS, musicTileTone } from "@/lib/catalog/music-guide";
import { localizedMusicTagName } from "@/lib/catalog/music-studio";
import { musicStudioCopy } from "@/lib/i18n/copy/music-page";
import { cn } from "@/lib/utils";

const GUIDE_SECTION_COPY = {
  "music-genres": { title: "genre", lead: "guideLeadGenres" },
  "music-styles": { title: "style", lead: "guideLeadStyles" },
  "music-moods": { title: "mood", lead: "guideLeadMoods" },
  "music-purposes": { title: "purpose", lead: "guideLeadPurposes" },
} as const;

export function MusicGuideSections() {
  const { locale } = useLocale();
  const copy = musicStudioCopy(locale);

  return (
    <div className="space-y-16">
      {MUSIC_GUIDE_SECTIONS.map((section) => {
        const keys = GUIDE_SECTION_COPY[section.id];
        return (
          <section key={section.id} id={section.id} className="scroll-mt-[76px]">
            <h2 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{copy[keys.title]}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel sm:text-base">{copy[keys.lead]}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const tone = musicTileTone(item.id);
                return (
                  <article key={item.id} className={cn("rounded-2xl border p-4 transition duration-200", tone.card)}>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("grid size-9 place-items-center rounded-xl", tone.icon)}>
                        <Icon className="size-4" />
                      </span>
                      <h3 className={cn("font-semibold text-text", tone.title)}>{localizedMusicTagName(item, locale)}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-steel">{locale === "ru" ? item.text : item.promptEn}</p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MusicGuideCta() {
  const { locale } = useLocale();
  const copy = musicStudioCopy(locale);

  return (
    <div className="rounded-2xl border border-border bg-mist/40 px-5 py-8 text-center">
      <p className="text-base font-semibold text-text">{copy.guideCtaTitle}</p>
      <p className="mt-2 text-sm text-steel">{copy.guideCtaLead}</p>
      <Link href="/music" className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#FF6F00] px-5 text-sm font-semibold text-white hover:bg-[#3b8ef0]">
        {copy.guideCta}
      </Link>
    </div>
  );
}
