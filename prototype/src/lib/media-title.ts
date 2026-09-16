export const MEDIA_TITLE_MIN = 4;
export const MEDIA_TITLE_MAX = 30;

export function normalizeMediaTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  const length = Array.from(title).length;
  return length === 0 || (length >= MEDIA_TITLE_MIN && length <= MEDIA_TITLE_MAX) ? title : null;
}
