"use client";

import { AgentBuilderDialog } from "@/components/agents/agent-builder-dialog";
import { TopUpDialog } from "@/components/profile/top-up-dialog";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { AuthenticatedAppSurfaces, type AuthenticatedSurface } from "@/components/layout/authenticated-app-surfaces";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { isImageStudioPath } from "@/lib/routes";
import { IS_STAGING } from "@/lib/site-env";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

const SIDEBAR_WIDTH = "xl:ps-[280px]";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const t = useT();
  const { locale } = useLocale();
  const pathname = useAppPathname();
  const { user, ready: authReady } = useAuth();
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenPath === pathname;

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/verify-email" || pathname === "/preview-login";
  const isAdminPage = pathname.startsWith("/admin");
  const isProfile = pathname.startsWith("/profile");
  const isAuthenticatedSupport = pathname === "/support" && authReady && Boolean(user);
  const activeSurface: AuthenticatedSurface | null = pathname.startsWith("/chat")
    ? "chat"
    : isImageStudioPath(pathname)
      ? "images"
      : pathname.startsWith("/music")
        ? "music"
      : pathname.startsWith("/battle")
        ? "battle"
        : pathname.startsWith("/agents")
          ? "agents"
          : pathname.startsWith("/rating")
            ? "rating"
        : isProfile
          ? "profile"
          : null;
  const pinGallery = pathname.startsWith("/gallery");
  const destGuest = IS_STAGING && !user;
  const guestSurface = destGuest
    ? activeSurface === "chat" || activeSurface === "battle"
    : activeSurface === "chat" || activeSurface === "images" || activeSurface === "music";
  const usePersistentSurface = Boolean(activeSurface && (guestSurface || (authReady && user)));
  const tightCatalogTop = pathname !== "/"
    && activeSurface !== "chat"
    && activeSurface !== "images"
    && activeSurface !== "music"
    && activeSurface !== "battle"
    && activeSurface !== "profile"
    && !pinGallery;

  if (isAdminPage) {
    return <>{children}</>;
  }
  if (isAuthPage) {
    return <>{children}<GoogleAnalytics /></>;
  }

  const sidebar = isProfile || isAuthenticatedSupport ? (
    <ProfileSidebar onNavigate={() => setMobileOpenPath(null)} />
  ) : (
    <WorkspaceSidebar onNavigate={() => setMobileOpenPath(null)} />
  );

  return (
    <>
      <SiteHeader onOpenSidebar={() => setMobileOpenPath(pathname)} />

      <aside data-lenis-prevent className="fixed bottom-0 start-0 top-[60px] z-40 hidden w-[280px] overflow-hidden overscroll-contain xl:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label={t.workspace.closeMenu}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpenPath(null)}
          />
          <div data-lenis-prevent className="relative z-10 h-full w-[85%] max-w-[300px] overflow-hidden overscroll-contain shadow-xl">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className={cn(
        "flex flex-1 flex-col",
        usePersistentSurface || pinGallery ? "min-h-0 overflow-hidden" : "min-h-min",
        SIDEBAR_WIDTH,
        tightCatalogTop && "[&_main>:first-child]:!pt-4",
      )}>
        {usePersistentSurface ? <AuthenticatedAppSurfaces active={activeSurface} /> : null}
        {usePersistentSurface ? null : children}
      </div>
      <AgentBuilderDialog key={locale} />
      <TopUpDialog key={`top-up-${locale}`} />
      <GoogleAnalytics />
      <CookieConsent />
    </>
  );
}
