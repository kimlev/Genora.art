export type PreloadableAuthenticatedSurface = "images" | "music";

const surfaceLoaders: Record<PreloadableAuthenticatedSurface, () => Promise<void>> = {
  images: () => import("@/components/images/image-studio").then(() => undefined),
  music: () => import("@/components/music/music-studio").then(() => undefined),
};

export function preloadAuthenticatedSurface(surface: PreloadableAuthenticatedSurface): Promise<void> {
  return surfaceLoaders[surface]();
}
