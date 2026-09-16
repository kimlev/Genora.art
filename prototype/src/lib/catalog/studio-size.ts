/** Чем больше число, тем выше качество: 360p → 4K, 0.5K → 4K. */
export function studioSizeRank(value: string): number {
  const raw = value.trim().toLowerCase();
  const kilo = raw.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (kilo) return Number(kilo[1]) * 1000;
  const pixels = raw.match(/^(\d+)\s*p$/);
  if (pixels) return Number(pixels[1]);
  const number = Number.parseInt(raw, 10);
  return Number.isFinite(number) ? number : 0;
}

export function sortStudioSizes(values: string[]): string[] {
  return [...values].sort((left, right) => studioSizeRank(left) - studioSizeRank(right) || left.localeCompare(right));
}
