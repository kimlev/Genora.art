export type ByteRange = { start: number; end: number };

export function parseSingleByteRange(value: string | null, total: number): ByteRange | null | undefined {
  if (!value) return undefined;
  if (!Number.isSafeInteger(total) || total <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, total - suffixLength), end: total - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : total - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= total || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, total - 1) };
}
