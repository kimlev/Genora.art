"use client";

export const GALLERY_FAVORITES_EVENT = "genora-favorites-change";

export function galleryFavoritesKey(userId: string) {
  return `genora-gallery-favorites:${userId}`;
}

export function readGalleryFavorites(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(galleryFavoritesKey(userId));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeGalleryFavorites(userId: string, ids: string[]) {
  window.localStorage.setItem(galleryFavoritesKey(userId), JSON.stringify(ids));
  window.dispatchEvent(new Event(GALLERY_FAVORITES_EVENT));
}

export function toggleGalleryFavorite(userId: string, id: string): string[] {
  const current = readGalleryFavorites(userId);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeGalleryFavorites(userId, next);
  return next;
}

export function subscribeGalleryFavorites(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(GALLERY_FAVORITES_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(GALLERY_FAVORITES_EVENT, listener);
  };
}
