"use client";

import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/ui/locale-link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  const t = useT();

  return (
    <div className="grid min-h-screen bg-surface md:grid-cols-2">
      <div className="relative flex min-h-screen flex-col">
        <div className="relative flex flex-1 flex-col px-6 py-8 sm:px-10">
          <div className="relative flex items-center justify-center">
            <Link
              href="/"
              aria-label={t.auth.backToHome}
              className="absolute left-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl border border-border text-text transition-colors hover:bg-mist"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <Link href="/" className="flex items-center gap-2.5 md:hidden">
              <Image
                src="/logo-mark.png"
                alt=""
                width={32}
                height={32}
                className="size-8"
                priority
              />
              <span className="text-lg font-semibold tracking-tight text-text">
                {t.brand}
              </span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>
      </div>

      <div className="relative hidden md:block">
        <div className="sticky top-0 h-screen">
          <AuthBrandPanel />
        </div>
      </div>
    </div>
  );
}

function AuthBrandPanel() {
  const t = useT();

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden p-10",
        "bg-[linear-gradient(160deg,oklch(0.22_0.04_248)_0%,oklch(0.17_0.035_252)_55%,oklch(0.14_0.03_248)_100%)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--accent) 45%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)",
        }}
      />

      <Link
        href="/"
        className="relative z-10 flex items-center gap-3 text-white transition-opacity hover:opacity-85"
      >
        <Image
          src="/logo-mark.png"
          alt=""
          width={44}
          height={44}
          className="size-11"
          priority
        />
        <span className="text-2xl font-semibold tracking-tight">{t.brand}</span>
      </Link>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-8 flex size-28 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <Sparkles className="size-12 text-accent-brand" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-semibold leading-snug text-white">{t.auth.sideTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {t.auth.sideDescription}
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/65">
        {t.auth.sideTriggers.map((trigger) => (
          <span key={trigger} className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-accent-brand" strokeWidth={2.5} />
            {trigger}
          </span>
        ))}
      </div>
    </div>
  );
}
