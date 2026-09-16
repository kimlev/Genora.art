"use client";

import { BattleShell } from "@/components/battle/battle-shell";
import { ChatShell } from "@/components/chat/chat-shell";
import { AgentsPageContent } from "@/components/agents/agents-page-content";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { RatingPageContent } from "@/components/rating/rating-page-content";
import { useLocale } from "@/components/providers/locale-provider";
import { preloadAuthenticatedSurface } from "@/components/layout/authenticated-surface-loader";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

const ImageStudio = dynamic(() => import("@/components/images/image-studio").then((mod) => mod.ImageStudio), {
  ssr: false,
  loading: () => <div className="grid min-h-0 flex-1 place-items-center text-sm text-steel">…</div>,
});

const MusicStudio = dynamic(() => import("@/components/music/music-studio").then((mod) => mod.MusicStudio), {
  ssr: false,
  loading: () => <div className="grid min-h-0 flex-1 place-items-center text-sm text-steel">…</div>,
});

export type AuthenticatedSurface = "chat" | "images" | "music" | "battle" | "agents" | "rating" | "profile";

function ScrollableSurface({ children }: { children: React.ReactNode }) {
  return <main data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto bg-bg">{children}</main>;
}

export function AuthenticatedAppSurfaces({ active }: { active: AuthenticatedSurface | null }) {
  const { locale } = useLocale();
  const [visited, setVisited] = useState<Set<AuthenticatedSurface>>(() => new Set(active ? [active] : []));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        preloadAuthenticatedSurface("images"),
        preloadAuthenticatedSurface("music"),
      ]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      setVisited((current) => current.has(active) ? current : new Set([...current, active]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div className={cn("relative h-[calc(100dvh-60px)] min-h-0 overflow-hidden", !active && "hidden")}>
      {(visited.has("chat") || active === "chat") ? (
        <section aria-hidden={active !== "chat"} className={surfaceClass(active === "chat")}>
          <ChatShell key={locale} />
        </section>
      ) : null}
      {(visited.has("images") || active === "images") ? (
        <section aria-hidden={active !== "images"} className={surfaceClass(active === "images")}>
          <Suspense fallback={<div className="grid min-h-0 flex-1 place-items-center text-sm text-steel">…</div>}>
            <ImageStudio key={locale} />
          </Suspense>
        </section>
      ) : null}
      {(visited.has("music") || active === "music") ? (
        <section aria-hidden={active !== "music"} className={surfaceClass(active === "music")}>
          <MusicStudio key={locale} />
        </section>
      ) : null}
      {(visited.has("battle") || active === "battle") ? (
        <section aria-hidden={active !== "battle"} className={surfaceClass(active === "battle")}>
          <BattleShell key={locale} />
        </section>
      ) : null}
      {(visited.has("agents") || active === "agents") ? (
        <section aria-hidden={active !== "agents"} className={surfaceClass(active === "agents")}>
          <ScrollableSurface>
            <AgentsPageContent key={locale} />
          </ScrollableSurface>
        </section>
      ) : null}
      {(visited.has("rating") || active === "rating") ? (
        <section aria-hidden={active !== "rating"} className={surfaceClass(active === "rating")}>
          <ScrollableSurface><RatingPageContent /></ScrollableSurface>
        </section>
      ) : null}
      {(visited.has("profile") || active === "profile") ? (
        <section aria-hidden={active !== "profile"} className={surfaceClass(active === "profile")}>
          <ProfileWorkspace />
        </section>
      ) : null}
    </div>
  );
}

function surfaceClass(isActive: boolean) {
  return cn(
    "absolute inset-0 flex min-h-0 flex-col transition-[opacity,transform] duration-150 ease-out",
    isActive
      ? "z-10 translate-y-0 opacity-100"
      : "pointer-events-none z-0 translate-y-1 opacity-0",
  );
}
