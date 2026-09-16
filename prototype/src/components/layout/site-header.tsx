"use client";

import { BrandMenu } from "@/components/layout/brand-menu";
import { LangToggle } from "@/components/layout/lang-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { HOME_ANCHOR_NAVIGATION_KEY, useSmoothScroll } from "@/components/providers/lenis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { PanelLeft } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useEffect, useState, type MouseEvent } from "react";

const navItems = [
  { hash: "#why", key: "why" as const },
  { hash: "#agents", key: "agents" as const },
  { hash: "#arena-ai", key: "arena" as const },
  { hash: "#image-generation", key: "images" as const },
  { hash: "#pricing", key: "pricing" as const },
  { hash: "#blog", key: "blog" as const },
  { hash: "#faq", key: "faq" as const },
];

type SiteHeaderProps = {
  onOpenSidebar?: () => void;
};

export function SiteHeader({ onOpenSidebar }: SiteHeaderProps) {
  const t = useT();
  const { user, ready: authReady } = useAuth();
  const pathname = useAppPathname();
  const { scrollToHash } = useSmoothScroll();
  const [scrolled, setScrolled] = useState(false);
  const isLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onAnchorClick = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (!isLanding) {
      sessionStorage.setItem(HOME_ANCHOR_NAVIGATION_KEY, JSON.stringify({ hash, createdAt: Date.now() }));
      return;
    }
    event.preventDefault();
    scrollToHash(hash);
    window.history.replaceState(null, "", hash);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[60px] border-b transition-colors duration-300",
        scrolled
          ? "border-border/80 bg-bg/85 backdrop-blur-xl"
          : "border-border/40 bg-bg/70 backdrop-blur-md",
      )}
    >
      <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-1.5">
          {onOpenSidebar ? (
            <button
              type="button"
              aria-label={t.workspace.openMenu}
              className="flex size-9 items-center justify-center rounded-xl text-steel transition-colors hover:bg-mist hover:text-text xl:hidden"
              onClick={onOpenSidebar}
            >
              <PanelLeft className="size-4" />
            </button>
          ) : null}
          <BrandMenu />
        </div>

        <nav
          className={cn("hidden items-center gap-1 lg:flex", (!authReady || user) && "lg:hidden")}
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.hash}
              href={`/${item.hash}`}
              onClick={(event) => onAnchorClick(event, item.hash)}
              className="rounded-xl px-3.5 py-2 text-sm text-steel transition-colors hover:bg-mist hover:text-text"
            >
              {t.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
