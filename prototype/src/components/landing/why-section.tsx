"use client";

import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { Layers3, SlidersHorizontal, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const icons = [Zap, Layers3, SlidersHorizontal];

export function WhySection() {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <section id="why" className="scroll-mt-[60px] bg-bg pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-brand">
            {t.why.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-[2.5rem] sm:leading-tight">
            {t.why.title}
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {t.why.items.map((item, index) => {
            const Icon = icons[index] ?? Zap;
            const featured = index === 1;

            return (
              <motion.article
                key={item.title}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.4,
                  delay: reduceMotion ? 0 : index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "rounded-2xl border p-6 text-left shadow-[0_12px_40px_-28px_rgba(15,40,80,0.25)]",
                  featured
                    ? "border-accent-brand/35 bg-[color-mix(in_oklch,var(--accent)_9%,var(--surface))]"
                    : "border-border bg-surface",
                )}
              >
                <div
                  className={cn(
                    "mb-4 inline-flex size-10 items-center justify-center rounded-xl",
                    featured
                      ? "bg-[#FF6F00] text-white"
                      : "bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-accent-brand",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-text">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-steel">
                  {item.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
