"use client";

import { useT } from "@/components/providers/locale-provider";
import { Clapperboard } from "lucide-react";

export function VideoTemplatesPage() {
  const t = useT();
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{t.workspace.menuImages}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text sm:text-6xl">{t.workspace.videoTemplatesTitle}</h1>
        <p className="mt-6 text-lg leading-relaxed text-steel">{t.workspace.videoTemplatesLead}</p>
      </div>
      <div className="mt-14 grid min-h-[240px] place-items-center rounded-[30px] border border-border bg-surface">
        <Clapperboard className="size-12 text-accent-brand" />
      </div>
    </section>
  );
}
