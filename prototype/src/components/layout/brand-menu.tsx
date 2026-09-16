"use client";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { IS_STAGING } from "@/lib/site-env";
import { useT } from "@/components/providers/locale-provider";
import { Link } from "@/components/ui/locale-link";

export function BrandMenu() {
  const t = useT();
  return (
    <Link
      href="/"
      aria-label={t.nav.home}
      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-text transition-colors hover:bg-mist"
    >
      <BrandWordmark className="text-base" />
      {IS_STAGING ? (
        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          dev
        </span>
      ) : null}
    </Link>
  );
}
