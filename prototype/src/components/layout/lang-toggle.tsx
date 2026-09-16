"use client";

import { useLocale, useT } from "@/components/providers/locale-provider";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { getLocaleOption, localeOptions } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Globe } from "lucide-react";

export function LangToggle({ className }: { className?: string }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const current = getLocaleOption(locale);

  return (
    <Menu
      align="end"
      ariaLabel={t.workspace.language}
      triggerClassName={cn(
        "flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-sm font-medium text-text transition-colors hover:bg-mist aria-expanded:bg-mist",
        className,
      )}
      panelClassName="w-[min(16rem,calc(100vw-16px))]"
      trigger={
        <>
          <Globe className="size-4 text-steel" />
          <span className="tabular-nums">{current.short}</span>
          <ChevronDown className="size-3.5 text-steel" />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>{t.workspace.language}</MenuLabel>
          <div className="relative">
            <div
              data-lenis-prevent
              className="max-h-[min(58vh,384px)] overflow-y-auto overscroll-contain pb-2"
            >
              {localeOptions.map((option) => (
                <MenuItem
                  key={option.code}
                  active={option.code === locale}
                  onClick={() => {
                    setLocale(option.code);
                    close();
                  }}
                >
                  <span className="w-7 shrink-0 text-xs font-semibold text-steel">
                    {option.short}
                  </span>
                  <span className="min-w-0 flex-1 truncate" lang={option.code}>
                    {option.label}
                  </span>
                  <span className="w-7 shrink-0 text-center text-base" aria-hidden="true">
                    {option.flag}
                  </span>
                  {option.code === locale ? (
                    <Check className="size-4 text-accent-brand" />
                  ) : null}
                </MenuItem>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-surface via-surface/80 to-transparent" />
          </div>
        </>
      )}
    </Menu>
  );
}
