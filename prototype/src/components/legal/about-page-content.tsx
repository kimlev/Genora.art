"use client";

import { LegalDocument } from "@/components/legal/legal-document";
import { useT } from "@/components/providers/locale-provider";

export function AboutPageContent() {
  const t = useT();

  return (
    <LegalDocument title={t.legal.aboutTitle} sections={t.legal.aboutSections} />
  );
}
