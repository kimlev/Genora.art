"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { authUiCopy } from "@/lib/i18n/copy/auth-ui";
import { passwordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const colors = {
  1: "bg-red-500 text-red-600 dark:text-red-400",
  2: "bg-orange-500 text-orange-600 dark:text-orange-400",
  3: "bg-yellow-400 text-yellow-700 dark:text-yellow-300",
  4: "bg-emerald-500 text-emerald-700 dark:text-emerald-400",
};
const widths = { 1: "w-1/4", 2: "w-1/2", 3: "w-3/4", 4: "w-full" };

export function PasswordStrengthMeter({ password, className }: { password: string; className?: string }) {
  const { locale } = useLocale();
  const strength = passwordStrength(password);
  if (!strength) return null;

  const copy = authUiCopy(locale);

  return (
    <div className={cn("space-y-1.5", className)} role="status" aria-live="polite">
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <span className={cn("block h-full rounded-full transition-all", widths[strength.level], colors[strength.level].split(" ")[0])} />
      </div>
      <div className="flex items-start justify-between gap-3 text-[11px]">
        <span className={cn("font-semibold", colors[strength.level].split(" ").slice(1))}>{copy.strengthLabels[strength.key]}</span>
        <span className="text-right text-steel">{copy.strengthHints[strength.key]}</span>
      </div>
    </div>
  );
}
