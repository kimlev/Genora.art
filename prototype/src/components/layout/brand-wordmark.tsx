import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  theme?: "light" | "dark";
};

export function BrandWordmark({ className, theme }: BrandWordmarkProps) {
  return (
    <span
      className={cn("inline-flex h-9 w-[180px] items-center", className)}
      aria-label="Genora.art"
    >
      <img src="/brand/genora-logo-light.svg" alt="Genora.art" className={cn("h-auto max-h-9 w-full object-contain object-left", theme === "dark" ? "hidden" : theme === "light" ? "block" : "block dark:hidden")} />
      <img src="/brand/genora-logo-dark.svg" alt="Genora.art" className={cn("h-auto max-h-9 w-full object-contain object-left", theme === "dark" ? "block" : theme === "light" ? "hidden" : "hidden dark:block")} />
    </span>
  );
}
