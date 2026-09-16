"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SeoArticleFaq } from "@/lib/content/seo-articles";

export function FaqAccordion({ title, items }: { title: string; items: SeoArticleFaq[] }) {
  return (
    <div className="mt-14 rounded-[28px] border border-border bg-surface px-4 sm:px-6">
      <h3 className="px-2 pt-6 text-xl font-semibold tracking-tight text-text sm:px-2">{title}</h3>
      <Accordion defaultValue={["faq-0"]} className="mt-2 pb-2">
        {items.map((item, index) => (
          <AccordionItem key={item.question} value={`faq-${index}`}>
            <AccordionTrigger className="py-4 text-base font-semibold text-text hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-steel sm:text-base">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
