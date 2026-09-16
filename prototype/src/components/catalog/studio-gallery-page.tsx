"use client";

import { AgentsTemplatesGallery } from "@/components/images/agents-templates-gallery";
import { useAuth } from "@/components/providers/auth-provider";
import { useCatalogAgentOverrides } from "@/lib/use-catalog-agent-overrides";
import { getCatalogAgentOverride } from "@/lib/catalog-agent-overrides";
import { videoAgentDefaults } from "@/lib/video-agent-catalog";
import { listVisibleAgents } from "@/lib/mock/agents";
import type { StudioGalleryTab } from "@/lib/image-agent-gallery";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { imageStudioAgentHref, videoStudioAgentHref } from "@/lib/routes";
import { useSearchParams } from "next/navigation";

function parseTab(value: string | null, fallback: StudioGalleryTab): StudioGalleryTab {
  if (value === "video") return "video";
  if (value === "photo" || value === "agents") return "photo";
  return fallback;
}

function hrefForTab(tab: StudioGalleryTab): string {
  if (tab === "video") return "/video-examples";
  return "/image-examples";
}

function tabFromPath(pathname: string, searchTab: string | null, fallback: StudioGalleryTab): StudioGalleryTab {
  if (pathname.startsWith("/video-examples")) return "video";
  if (pathname.startsWith("/image-examples")) return parseTab(searchTab, "photo");
  return parseTab(searchTab, fallback);
}

export function StudioGalleryPage({ defaultTab }: { defaultTab: StudioGalleryTab }) {
  const searchParams = useSearchParams();
  const pathname = useAppPathname();
  const router = useLocaleRouter();
  const { user } = useAuth();
  const tab = tabFromPath(pathname, searchParams.get("tab"), defaultTab);
  const catalogVersion = useCatalogAgentOverrides();
  const galleryAgents = (() => {
    void catalogVersion;
    return listVisibleAgents()
      .filter((agent) => agent.category === "images" || agent.category === "video")
      .map((agent) => {
        const override = getCatalogAgentOverride(agent.id);
        const defaults = videoAgentDefaults(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          category: agent.category as "images" | "video",
          tag: override?.tag ?? defaults?.tag,
          coverUrl: override?.coverUrl ?? defaults?.coverUrl,
          videoUrl: override?.videoUrl ?? defaults?.videoUrl,
          videoPreviewUrl: override?.videoPreviewUrl ?? defaults?.videoPreviewUrl,
        };
      });
  })();

  const goStudio = (agentId: string) => {
    router.push(user ? imageStudioAgentHref(agentId) : "/register");
  };
  const goVideoStudio = (agentId: string) => {
    router.push(user ? videoStudioAgentHref(agentId) : "/register");
  };

  return (
    <>
      <AgentsTemplatesGallery
        variant="page"
        tab={tab}
        onTabChange={(next) => {
          if (next === tab) return;
          router.push(hrefForTab(next));
        }}
        agents={galleryAgents}
        onChooseAgent={goStudio}
        onChooseVideoAgent={goVideoStudio}
        onChooseTemplate={(id) => goStudio(id)}
      />
    </>
  );
}
