"use client";

import Lenis from "lenis";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { isImageStudioPath } from "@/lib/routes";
import { resetScrollLocks } from "@/lib/scroll-lock";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";

// У секций уже есть scroll-mt под высоту шапки, добавляем небольшой воздух
const HEADER_OFFSET = -12;
export const HOME_ANCHOR_NAVIGATION_KEY = "genora-home-anchor-navigation";

type SmoothScrollContextValue = {
  scrollToHash: (hash: string) => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  scrollToHash: () => {},
});

type LenisProviderProps = {
  children: ReactNode;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resetNativeScroll() {
  resetScrollLocks();
  const html = document.documentElement;
  html.classList.remove("lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling");
  html.style.removeProperty("overflow");
  html.style.removeProperty("height");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("position");
}

export function LenisProvider({ children }: LenisProviderProps) {
  const pathname = useAppPathname();
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  const scrollToHash = useCallback((hash: string) => {
    const id = hash.replace(/^.*#/, "");
    const target = document.getElementById(id);
    if (!target) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: HEADER_OFFSET });
      return;
    }

    // scroll-mt на секциях сам учитывает высоту шапки
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useLayoutEffect(() => {
    if (pathname !== "/" || !window.location.hash) return;

    const rawNavigation = sessionStorage.getItem(HOME_ANCHOR_NAVIGATION_KEY);
    sessionStorage.removeItem(HOME_ANCHOR_NAVIGATION_KEY);
    const navigationType = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    try {
      const requestedNavigation = rawNavigation
        ? JSON.parse(rawNavigation) as { hash?: string; createdAt?: number }
        : null;
      const isFreshInternalNavigation = requestedNavigation?.hash === window.location.hash
        && typeof requestedNavigation.createdAt === "number"
        && Date.now() - requestedNavigation.createdAt < 10_000;
      if (navigationType?.type !== "reload" && isFreshInternalNavigation) return;
    } catch {
      // Старые или повреждённые данные навигации не должны возвращать страницу к секции.
    }

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const isHome = pathname === "/";
    const isInternalRoute = pathname.startsWith("/chat") || isImageStudioPath(pathname)
      || pathname.startsWith("/battle") || pathname.startsWith("/agents") || pathname.startsWith("/rating")
      || pathname.startsWith("/admin") || pathname.startsWith("/profile")
      || pathname.startsWith("/models") || pathname.startsWith("/image-examples")
      || pathname.startsWith("/pricing") || pathname.startsWith("/legal") || pathname.startsWith("/blog")
      || pathname.startsWith("/music") || pathname.startsWith("/gallery") || pathname.startsWith("/video-examples") || pathname.startsWith("/create-foto-video") || pathname.startsWith("/about") || pathname.startsWith("/support");
    const shouldDisable = prefersReducedMotion() || (!isHome && isInternalRoute);

    if (shouldDisable) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      resetNativeScroll();
      return;
    }

    const lenis = new Lenis({
      duration: 1.85,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lenis.destroy();
      lenisRef.current = null;
      resetNativeScroll();
    };
  }, [pathname]);

  useEffect(() => {
    const hash = window.location.hash;

    // С якорем — доскроллить после отрисовки, без якоря — начать страницу сверху
    if (hash) {
      const timer = window.setTimeout(() => scrollToHash(hash), 120);
      return () => window.clearTimeout(timer);
    }

    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname, scrollToHash]);

  const value = useMemo(() => ({ scrollToHash }), [scrollToHash]);

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export function useSmoothScroll(): SmoothScrollContextValue {
  return useContext(SmoothScrollContext);
}
