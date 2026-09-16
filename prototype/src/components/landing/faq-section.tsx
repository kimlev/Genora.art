"use client";

import { useT } from "@/components/providers/locale-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion, useReducedMotion } from "motion/react";

export function FaqSection() {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <section id="faq" className="scroll-mt-[60px] border-t border-border bg-mist/30 pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {t.faq.title}
          </h2>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-surface px-4 sm:px-6"
        >
          <Accordion defaultValue={["faq-0"]}>
            {t.faq.items.map((item, index) => (
              <AccordionItem key={`faq-${index}`} value={`faq-${index}`}>
                <AccordionTrigger className="py-4 text-base text-text hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-steel">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
