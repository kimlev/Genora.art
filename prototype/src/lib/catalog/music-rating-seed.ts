import type { ImageRatingSeed } from "@/lib/catalog/image-rating-seed";

export const MUSIC_RATING_SEED: Record<string, ImageRatingSeed> = {
  "lyria-3-pro-preview": { score: 1710, votes: 860 },
  "lyria-3-clip-preview": { score: 1424, votes: 640 },
  music_v2: { score: 1688, votes: 920 },
  auto: { score: 1550, votes: 540 },
  "mureka-9.5": { score: 1622, votes: 480 },
  "mureka-9": { score: 1496, votes: 410 },
  "mureka-8": { score: 1318, votes: 360 },
  "mureka-o2": { score: 1584, votes: 290 },
  "music-3": { score: 1640, votes: 360 },
  "music-2.6": { score: 1580, votes: 310 },
  "music-2.5": { score: 1460, votes: 250 },
  "music-2.0": { score: 1340, votes: 200 },
  "v1.1-text": { score: 1520, votes: 180 },
  "v1.1-video": { score: 1610, votes: 220 },
};

export function musicRatingFor(id: string): ImageRatingSeed {
  return MUSIC_RATING_SEED[id] ?? { score: 1280, votes: 240 };
}
