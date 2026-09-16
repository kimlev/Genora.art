import "server-only";
import { billedTokensFromUsd } from "@/lib/billing";
import { estimateMusicCostUsd } from "@/lib/catalog/music-studio";
import { videoTokensForClip, type VideoCatalogModel, type VideoSound } from "@/lib/catalog/video-studio";
import type { IntegratorImageModel, IntegratorMusicModel } from "@/lib/server/integrator";

function validQuote(tokens: number | null) {
  if (tokens == null || !Number.isSafeInteger(tokens) || tokens <= 0) throw new Error("GENERATION_PRICE_UNAVAILABLE");
  return tokens;
}

export function quoteImage(model: IntegratorImageModel, size: string, quality: string | undefined, count: number, multiplier: number) {
  const variant = quality || model.reasoning?.defaultValue || "default";
  const price = model.price_per_image_usd[`${size}:${variant}`]
    ?? model.price_per_image_usd[size];
  if (price == null || !Number.isFinite(Number(price)) || Number(price) <= 0) throw new Error("GENERATION_PRICE_UNAVAILABLE");
  return validQuote(billedTokensFromUsd(Number(price), multiplier) * count);
}

export function quoteVideo(model: VideoCatalogModel, resolution: string, sound: VideoSound, duration: number, multiplier: number) {
  return validQuote(videoTokensForClip({ ...model, multiplier }, resolution, sound, duration));
}

export function quoteMusic(model: IntegratorMusicModel, duration: number | undefined, multiplier: number) {
  return validQuote(billedTokensFromUsd(estimateMusicCostUsd(model, duration ?? model.default_duration ?? 180), multiplier));
}
