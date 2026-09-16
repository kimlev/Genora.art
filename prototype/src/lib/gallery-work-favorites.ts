export type GalleryFavoriteWork = { id: string; rateId?: string };

export function galleryWorkFavoriteId(work: GalleryFavoriteWork): string {
  return work.rateId || work.id;
}

export function galleryWorkIsFavorite(work: GalleryFavoriteWork, favorites: string[]): boolean {
  return favorites.includes(galleryWorkFavoriteId(work)) || favorites.includes(work.id);
}

export function normalizeGalleryFavoriteIds(favorites: string[], works: GalleryFavoriteWork[]): string[] {
  const canonicalByWorkId = new Map(works.map((work) => [work.id, galleryWorkFavoriteId(work)]));
  return [...new Set(favorites.map((id) => canonicalByWorkId.get(id) ?? id))];
}
