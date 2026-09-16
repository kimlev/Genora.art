"use client";

import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Coins, Eye, Layers3, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "@/components/ui/locale-link";

const benefitIcons = [Coins, Eye, Layers3, ShieldCheck];

export function PricingSection() {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <section id="pricing" className="scroll-mt-[60px] bg-bg pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-[28px] border border-border bg-mist/55"
        >
          <div className="grid gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">
                {t.pricingLanding.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
                {t.pricingLanding.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-steel">
                {t.pricingLanding.subtitle}
              </p>
              <Button
                nativeButton={false}
                className="mt-7 h-12 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white hover:bg-[#3b8ef0]"
                render={<Link href="/pricing" />}
              >
                {t.pricingLanding.cta}
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {t.pricingLanding.benefits.map((benefit, index) => {
                const Icon = benefitIcons[index] ?? Coins;
                return (
                  <article key={benefit.title} className="rounded-2xl border border-border bg-surface p-5">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-accent-brand">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-semibold text-text">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-steel">{benefit.description}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border bg-surface/70 px-6 py-4 text-sm text-steel sm:px-10 lg:px-14">
            {t.pricingLanding.notes.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="size-4 text-[#FF6F00]" /> {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
