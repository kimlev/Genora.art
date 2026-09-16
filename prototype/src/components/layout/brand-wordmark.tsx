import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  theme?: "light" | "dark";
};

export function BrandWordmark({ className, theme }: BrandWordmarkProps) {
  const imageClassName = "h-auto max-h-9 w-full object-contain object-left";

  return (
    <span
      className={cn("inline-flex h-9 w-[180px] items-center", className)}
      aria-label="Genora.art"
    >
      {theme ? (
        <img
          src={theme === "dark" ? "/brand/genora-logo-dark.svg?v=2" : "/brand/genora-logo-light.svg?v=2"}
          alt="Genora.art"
          className={imageClassName}
        />
      ) : (
        <>
          <img src="/brand/genora-logo-light.svg?v=2" alt="Genora.art" className={cn(imageClassName, "block dark:hidden")} />
          <img src="/brand/genora-logo-dark.svg?v=2" alt="Genora.art" className={cn(imageClassName, "hidden dark:block")} />
        </>
      )}
    </span>
  );
}
