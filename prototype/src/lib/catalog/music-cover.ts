export const SONG_COVER_PROVIDER = "alibaba";
export const SONG_COVER_MODEL = "z-image-turbo";
export const SONG_COVER_SIZE = "1K";
export const SONG_COVER_FORMAT = "1:1";
export const SONG_COVER_STYLE = "auto";
export const SONG_COVER_WORDS_MAX = 30;
export const SONG_COVER_DESC_MAX = 1000;
export const SONG_COVER_EDGE = 1024;
export const SONG_COVER_MAX_BYTES = 8 * 1024 * 1024;
export const SONG_COVER_ACCEPT = "image/png,image/jpeg,image/webp";

export function songCoverTokenPrice(prices?: Record<string, number>): number {
  if (!prices) return 0;
  const preferred = [SONG_COVER_SIZE, `${SONG_COVER_SIZE}:default`, `${SONG_COVER_SIZE}:${SONG_COVER_STYLE}`];
  for (const key of preferred) {
    const value = Number(prices[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const sized = Object.entries(prices)
    .filter(([key]) => key === SONG_COVER_SIZE || key.startsWith(`${SONG_COVER_SIZE}:`))
    .map(([, value]) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return sized.length ? Math.min(...sized) : 0;
}

export function songCoverPrompt(input: {
  words?: string;
  description?: string;
  genre?: string | null;
  style?: string | null;
  mood?: string | null;
  purpose?: string | null;
}): string {
  const text = (input.words ?? "").trim().slice(0, SONG_COVER_WORDS_MAX);
  const brief = (input.description ?? "").trim().slice(0, SONG_COVER_DESC_MAX);
  const atmosphere = [input.genre, input.style, input.mood, input.purpose].map((item) => item?.trim()).filter(Boolean).join(", ");
  return [
    "Create a square music album cover.",
    `Required cover size: ${SONG_COVER_SIZE}, aspect ratio ${SONG_COVER_FORMAT}, ${SONG_COVER_EDGE}x${SONG_COVER_EDGE} pixels.`,
    atmosphere
      ? `Show this music only through imagery, color, light and composition. Genre, style, mood and purpose are visual cues, never captions. Do not write, stamp or typeset any of these words: ${atmosphere}.`
      : "Emotional, professional album artwork.",
    brief
      ? `Turn the following brief or lyrics into a visual scene only. Never print these words, lyrics, titles or letters:\n${brief}`
      : "Invent the artwork from the visual cues above.",
    "Hard rule: never print genre, mood, style, purpose, song title, lyrics, watermarks or any other letters.",
    text
      ? `The only allowed text is this cover phrase from the dedicated on-cover field, large and readable: "${text}". Print nothing else.`
      : "The cover must be completely wordless.",
  ].join("\n");
}
