import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { noIndexMetadata, SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return { title: `${t.auth.verifyCheckingTitle} — ${SITE_NAME}`, ...noIndexMetadata };
}

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
