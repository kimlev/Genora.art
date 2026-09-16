"use client";

import { usePublicContactEmail } from "@/components/layout/use-public-contact-email";
import { useT } from "@/components/providers/locale-provider";
import { applyPublicContactEmail } from "@/lib/public-contact";
import { ArrowRight, BrainCircuit, Layers3, Sparkles } from "lucide-react";
import { Link } from "@/components/ui/locale-link";

const icons = [Layers3, BrainCircuit, Sparkles];

export function AboutPageContent() {
  const t = useT();
  const contactEmail = usePublicContactEmail();
  const [lead, ...rest] = t.legal.aboutSections;

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{t.legal.nav.about}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text sm:text-6xl">{t.legal.aboutTitle}</h1>
        {lead ? <p className="mt-6 text-lg leading-relaxed text-steel">{applyPublicContactEmail(lead.body, contactEmail)}</p> : null}
      </div>

      {rest.length ? (
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {rest.map((section, index) => {
            const Icon = icons[index] ?? Sparkles;
            return (
              <article key={section.title} className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-mist text-accent-brand">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-text">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-steel">{applyPublicContactEmail(section.body, contactEmail)}</p>
              </article>
            );
          })}
        </div>
      ) : null}

      <section className="mt-14 rounded-[30px] bg-[#111827] px-6 py-10 text-white sm:px-10 sm:py-14">
        <h2 className="text-3xl font-semibold">{t.why.title}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-white/70">{t.why.subtitle}</p>
        <Link href="/support" className="mt-7 inline-flex items-center gap-2 font-medium text-[#FF6F00]">
          {t.support.title} <ArrowRight className="size-4" />
        </Link>
      </section>
    </section>
  );
}
