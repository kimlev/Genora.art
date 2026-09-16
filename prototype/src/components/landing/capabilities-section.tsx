"use client";

import { useT } from "@/components/providers/locale-provider";
import { Bot, BrainCircuit, GitCompareArrows, ShieldCheck } from "lucide-react";

const icons = [BrainCircuit, Bot, GitCompareArrows];

export function CapabilitiesSection() {
  const t = useT();

  return (
    <section className="bg-bg py-16 sm:py-24" aria-labelledby="capabilities-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">{t.capabilities.eyebrow}</p>
          <h2 id="capabilities-title" className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{t.capabilities.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-steel">{t.capabilities.subtitle}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {t.capabilities.items.map((item, index) => {
            const Icon = icons[index] ?? BrainCircuit;
            return (
              <article key={item.title} className={`rounded-[24px] border p-6 ${index === 0 ? "border-accent-brand/35 bg-[color-mix(in_oklch,var(--accent)_9%,var(--surface))]" : "border-border bg-surface"}`}>
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#FF6F00] text-white"><Icon className="size-5" /></span>
                <h3 className="mt-5 text-xl font-semibold text-text">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-steel">{item.description}</p>
                <ul className="mt-5 space-y-2">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-text"><ShieldCheck className="size-4 text-accent-brand" />{point}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
