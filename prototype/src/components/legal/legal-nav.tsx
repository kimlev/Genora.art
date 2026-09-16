"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { splitLocalePath, withLocalePath } from "@/lib/i18n/locale-path";
import { legalDocuments, legalTextLocale } from "@/lib/legal/documents";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/locale-link";
import { usePathname } from "next/navigation";

export function LegalNav() {
  const currentPath = splitLocalePath(usePathname()).path;
  const { locale } = useLocale();
  const english = legalTextLocale(locale) === "en";

  return (
    <nav aria-label="Legal documents" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-2 lg:block lg:space-y-1 lg:overflow-visible">
      {legalDocuments.map((document) => {
        const href = withLocalePath(`/legal/${document.slug}`, locale);
        return (
        <Link
          key={document.slug}
          href={href}
          className={cn(
            "block shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs transition-colors lg:whitespace-normal lg:text-sm",
            currentPath === `/legal/${document.slug}`
              ? "bg-mist font-medium text-text"
              : "text-steel hover:bg-mist/60 hover:text-text",
          )}
        >
          {english ? document.shortTitleEn : document.shortTitle}
        </Link>
        );
      })}
    </nav>
  );
}
