import type { ImageRatingSeed } from "@/lib/catalog/image-rating-seed";

export const VIDEO_RATING_SEED: Record<string, ImageRatingSeed> = {
  "veo-3.1": { score: 1880, votes: 1240 },
  "veo-3.1-fast": { score: 1710, votes: 980 },
  "veo-3.1-lite": { score: 1420, votes: 640 },
  "omni-1.1-flash": { score: 1560, votes: 420 },
  "wan-3.0": { score: 1740, votes: 860 },
  "wan-2.7": { score: 1610, votes: 610 },
  "wan-2.6": { score: 1380, votes: 540 },
  "hailuo-3": { score: 1690, votes: 720 },
  "hailuo-2.3": { score: 1510, votes: 480 },
  "seedance-2.5": { score: 1760, votes: 690 },
  "seedance-2.0": { score: 1680, votes: 810 },
  "seedance-2.0-fast": { score: 1540, votes: 520 },
  "seedance-2.0-mini": { score: 1320, votes: 390 },
  "seedance-1-5-pro": { score: 1470, votes: 450 },
  "kling-v3.0-pro": { score: 1720, votes: 780 },
  "kling-v3.0-std": { score: 1580, votes: 560 },
  "kling-video-o1": { score: 1490, votes: 410 },
  "kling-2.6-mc-std": { score: 1520, votes: 180 },
  "kling-2.6-mc-pro": { score: 1610, votes: 210 },
  "kling-3.0-mc-std": { score: 1660, votes: 240 },
  "kling-3.0-mc-pro": { score: 1740, votes: 280 },
  "flux-3-video": { score: 1640, votes: 370 },
  "gen-4.5": { score: 1590, votes: 430 },
};

export function videoRatingFor(id: string): ImageRatingSeed {
  return VIDEO_RATING_SEED[id] ?? { score: 1300, votes: 220 };
}
