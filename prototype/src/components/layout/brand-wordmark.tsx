import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
};

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span
      className={cn("inline-flex h-9 w-[180px] items-center", className)}
      aria-label="Genora.art"
    >
      <img src="/brand/genora-logo-light.svg" alt="Genora.art" className="block h-auto max-h-9 w-full object-contain object-left dark:hidden" />
      <img src="/brand/genora-logo-dark.svg" alt="Genora.art" className="hidden h-auto max-h-9 w-full object-contain object-left dark:block" />
    </span>
  );
}
