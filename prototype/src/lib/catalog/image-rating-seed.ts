export type ImageRatingSeed = { score: number; votes: number };

export const IMAGE_RATING_SEED: Record<string, ImageRatingSeed> = {
  "ideogram-v4": { score: 1842, votes: 2_640 },
  "gemini-3.1-flash-lite-image": { score: 1218, votes: 1_860 },
  "gemini-3.1-flash-image": { score: 1486, votes: 2_210 },
  "gemini-3-pro-image": { score: 1764, votes: 1_940 },
  "gpt-image-2": { score: 1888, votes: 3_120 },
  "grok-imagine-image": { score: 1520, votes: 1_480 },
  "grok-imagine-image-quality": { score: 1695, votes: 980 },
  "grok-imagine-image-2.0": { score: 1738, votes: 1_120 },
  "wan2.7-image-pro": { score: 1612, votes: 860 },
  "wan2.7-image": { score: 1394, votes: 1_040 },
  "qwen-image-2.0-pro": { score: 1580, votes: 720 },
  "qwen-image-2.0": { score: 1326, votes: 890 },
  "z-image-turbo": { score: 1188, votes: 1_560 },
  "flux.2-pro": { score: 1810, votes: 2_040 },
  "flux.2-flex": { score: 1544, votes: 1_280 },
  "flux.2-max": { score: 1866, votes: 760 },
};

export function imageRatingFor(id: string): ImageRatingSeed {
  return IMAGE_RATING_SEED[id] ?? { score: 1240, votes: 420 };
}
