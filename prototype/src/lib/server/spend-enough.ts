import "server-only";

import { imageAverageRequestCost } from "@/lib/admin-models";
import { BALANCE_TOKENS_PER_USD } from "@/lib/billing";
import { DEFAULT_MUSIC_MULTIPLIER, musicDbId, musicModelMultiplier, musicModelTokenPrices } from "@/lib/catalog/music-studio";
import {
  AVERAGE_VIDEO_SECONDS,
  DEFAULT_VIDEO_MULTIPLIER,
  averageCatalogVideoTokens,
  videoDbId,
  videoModelTokenPrices,
} from "@/lib/catalog/video-studio";
import { IS_STAGING } from "@/lib/site-env";
import {
  LARGE_CONTEXT_INPUT_TOKENS,
  LARGE_CONTEXT_OUTPUT_TOKENS,
  averageCatalogSongTokens,
  averageUsd,
  spendEnoughCostTokens,
} from "@/lib/token-spend-estimate";
import { utcDateString } from "@/lib/welcome-bonus";
import { integratorAverageCosts, integratorImageCatalog, integratorModels, integratorMusicCatalog, integratorVideoCatalog } from "@/lib/server/integrator";
import { query } from "@/lib/server/db";

export type SpendEnoughSnapshot = {
  day: string;
  textTokens: number;
  imageTokens: number;
  songTokens: number;
  videoTokens: number;
};

type DailyRow = {
  day: Date | string;
  text_tokens: number;
  image_tokens: number;
  song_tokens: number | null;
  song_avg_usd: string | number | null;
  video_tokens: number | null;
  video_avg_usd: string | number | null;
};

function asDay(value: Date | string): string {
  if (value instanceof Date) return utcDateString(value);
  return String(value).slice(0, 10);
}

function toSnapshot(row: DailyRow): SpendEnoughSnapshot {
  return {
    day: asDay(row.day),
    textTokens: Number(row.text_tokens),
    imageTokens: Number(row.image_tokens),
    songTokens: Number(row.song_tokens ?? 0),
    videoTokens: Number(row.video_tokens ?? 0),
  };
}

function largeContextUsd(inputPer1MUsd: number, outputPer1MUsd: number): number {
  const usd = (LARGE_CONTEXT_INPUT_TOKENS * inputPer1MUsd + LARGE_CONTEXT_OUTPUT_TOKENS * outputPer1MUsd) / 1_000_000;
  return Number.isFinite(usd) && usd > 0 ? usd : 0;
}

async function computeSongCatalogTokens(): Promise<{ songTokens: number; songUsd: number }> {
  const [songAverages, musicModels, providers, models] = await Promise.all([
    integratorAverageCosts("song").catch(() => []),
    integratorMusicCatalog().catch(() => []),
    query<{ id: string; billing_multiplier: string }>("SELECT id,billing_multiplier FROM ai_providers WHERE active=true").catch(() => []),
    query<{ id: string; markup_multiplier: string }>("SELECT id,markup_multiplier FROM ai_models WHERE active=true").catch(() => []),
  ]);
  const multiplierByProvider = new Map(providers.map((row) => [row.id, Number(row.billing_multiplier)]));
  const multiplierByModel = new Map(models.map((row) => [row.id, Number(row.markup_multiplier)]));
  const priced = musicModels
    .filter((model) => model.available !== false && model.modes.includes("song"))
    .map((model) => {
      const multiplier = musicModelMultiplier(
        model.provider,
        multiplierByModel.get(musicDbId(model.provider, model.id))
          ?? multiplierByProvider.get(model.provider)
          ?? DEFAULT_MUSIC_MULTIPLIER,
      );
      return {
        provider: model.provider,
        id: model.id,
        duration_control: model.duration_control,
        ...musicModelTokenPrices(model, multiplier),
      };
    });
  const songTokens = Math.round(averageCatalogSongTokens(
    priced,
    songAverages.map((item) => ({ provider: item.provider, model: item.model, requestCount: item.requestCount ?? 0 })),
  ));
  return { songTokens, songUsd: songTokens > 0 ? songTokens / BALANCE_TOKENS_PER_USD : 0 };
}

async function computeVideoCatalogTokens(): Promise<{ videoTokens: number; videoUsd: number }> {
  const [videoModels, providers, models] = await Promise.all([
    integratorVideoCatalog().catch(() => []),
    query<{ id: string; billing_multiplier: string }>("SELECT id,billing_multiplier FROM ai_providers WHERE active=true").catch(() => []),
    query<{ id: string; markup_multiplier: string }>("SELECT id,markup_multiplier FROM ai_models WHERE active=true").catch(() => []),
  ]);
  const multiplierByProvider = new Map(providers.map((row) => [row.id, Number(row.billing_multiplier)]));
  const multiplierByModel = new Map(models.map((row) => [row.id, Number(row.markup_multiplier)]));
  const priced = videoModels.map((model) => {
    const multiplier = multiplierByModel.get(videoDbId(model.provider, model.id))
      ?? multiplierByProvider.get(model.provider)
      ?? DEFAULT_VIDEO_MULTIPLIER;
    return { ...model, multiplier, ...videoModelTokenPrices(model, multiplier) };
  });
  const videoTokens = Math.round(averageCatalogVideoTokens(priced, AVERAGE_VIDEO_SECONDS));
  return { videoTokens, videoUsd: videoTokens > 0 ? videoTokens / BALANCE_TOKENS_PER_USD : 0 };
}

async function computeAverages(): Promise<{ textUsd: number; imageUsd: number; songTokens: number; songUsd: number; videoTokens: number; videoUsd: number }> {
  const [textModels, imageCatalog, song, video] = await Promise.all([
    integratorModels().catch(() => []),
    integratorImageCatalog().catch(() => ({ models: [] })),
    computeSongCatalogTokens(),
    computeVideoCatalogTokens(),
  ]);
  const textFromIntegrator = averageUsd(textModels.map((model) => model.average_request_cost_usd));
  const textFromRates = averageUsd(textModels.map((model) => largeContextUsd(model.pricing.input_per_1m_usd, model.pricing.output_per_1m_usd)));
  const imageUsd = averageUsd(imageCatalog.models.map((model) => imageAverageRequestCost(model)));
  return {
    textUsd: textFromIntegrator || textFromRates,
    imageUsd,
    songTokens: song.songTokens,
    songUsd: song.songUsd,
    videoTokens: video.videoTokens,
    videoUsd: video.videoUsd,
  };
}

async function refreshMediaRates(day: string) {
  const [song, video] = await Promise.all([computeSongCatalogTokens(), computeVideoCatalogTokens()]);
  await query(
    `UPDATE spend_enough_daily SET song_tokens=$2, song_avg_usd=$3, video_tokens=$4, video_avg_usd=$5 WHERE day=$1::date`,
    [day, song.songTokens, song.songUsd || null, video.videoTokens, video.videoUsd || null],
  );
  return { songTokens: song.songTokens, videoTokens: video.videoTokens };
}

export async function ensureSpendEnoughToday(): Promise<SpendEnoughSnapshot | null> {
  if (!IS_STAGING) return null;
  const day = utcDateString();
  const existing = await query<DailyRow>(
    "SELECT day, text_tokens, image_tokens, song_tokens, song_avg_usd, video_tokens, video_avg_usd FROM spend_enough_daily WHERE day=$1::date",
    [day],
  );
  if (existing[0] && existing[0].song_avg_usd != null) {
    const media = await refreshMediaRates(day);
    return { ...toSnapshot(existing[0]), ...media };
  }
  const averages = await computeAverages();
  const textTokens = spendEnoughCostTokens(averages.textUsd);
  const imageTokens = spendEnoughCostTokens(averages.imageUsd);
  const songTokens = averages.songTokens;
  const videoTokens = averages.videoTokens;
  if (existing[0]) {
    const media = await refreshMediaRates(day);
    return { day, textTokens: Number(existing[0].text_tokens), imageTokens: Number(existing[0].image_tokens), ...media };
  }
  if (textTokens <= 0 && imageTokens <= 0 && songTokens <= 0 && videoTokens <= 0) {
    return { day, textTokens: 0, imageTokens: 0, songTokens: 0, videoTokens: 0 };
  }
  await query(
    `INSERT INTO spend_enough_daily(day, text_tokens, image_tokens, song_tokens, video_tokens, text_avg_usd, image_avg_usd, song_avg_usd, video_avg_usd)
     VALUES($1::date,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (day) DO UPDATE SET
       song_tokens=EXCLUDED.song_tokens,
       song_avg_usd=EXCLUDED.song_avg_usd,
       video_tokens=EXCLUDED.video_tokens,
       video_avg_usd=EXCLUDED.video_avg_usd`,
    [day, textTokens, imageTokens, songTokens, videoTokens, averages.textUsd || null, averages.imageUsd || null, averages.songUsd || null, averages.videoUsd || null],
  );
  const stored = await query<DailyRow>("SELECT day, text_tokens, image_tokens, song_tokens, song_avg_usd, video_tokens, video_avg_usd FROM spend_enough_daily WHERE day=$1::date", [day]);
  return stored[0] ? toSnapshot(stored[0]) : { day, textTokens, imageTokens, songTokens, videoTokens };
}
