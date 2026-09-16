"use client";

import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Swords, Timer, Trophy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "@/components/ui/locale-link";

export function ArenaSection() {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const previewAnswers = [
    { name: "GPT-5.6 Sol", time: "14s", text: t.arena.leftText },
    { name: "Claude Opus 5", time: "18s", text: t.arena.rightText },
  ];

  return (
    <section id="arena-ai" className="scroll-mt-[60px] bg-mist/40 pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.45 }} className="overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_28px_80px_-58px_color-mix(in_oklch,var(--accent)_55%,transparent)]">
          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:p-14">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand"><Swords className="size-4" />{t.arena.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{t.arena.title}</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-steel">{t.arena.subtitle}</p>
              <ul className="mt-6 space-y-3">{t.arena.advantages.map((item) => <li key={item} className="flex items-start gap-2.5 text-sm text-text"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-brand" />{item}</li>)}</ul>
              <Button nativeButton={false} className="mt-8 h-12 rounded-xl bg-[#FF6F00] px-6 font-semibold text-white hover:bg-[#3b8ef0]" render={<Link href="/register" />}>{t.arena.cta} <ArrowRight className="size-4" /></Button>
            </div>

            <div className="rounded-[26px] border border-border bg-mist/55 p-3 sm:p-5">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-text"><Swords className="size-4 text-accent-brand" />{t.arena.previewTitle}</div>
              <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {previewAnswers.map((answer, index) => <article key={answer.name} className="min-w-0 p-3 sm:p-5"><p className="truncate text-[11px] font-semibold text-steel">{answer.name}</p><p className="mt-3 text-xs leading-relaxed text-text sm:text-sm">{answer.text}</p><div className="mt-5 flex flex-col gap-2 text-[10px] text-steel sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-1"><Timer className="size-3" />{t.arena.thought} {answer.time}</span>{index === 0 ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><Trophy className="size-3" />{t.arena.selected}</span> : <span>{t.arena.compare}</span>}</div></article>)}
              </div>
              <p className="mt-3 text-center text-[11px] text-steel">{t.arena.caption}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
