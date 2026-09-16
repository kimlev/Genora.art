import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMusicVideoDuration,
  estimateMusicCostUsd,
  isAllowedMusicVideoFile,
  isAllowedMusicVideoType,
  looksLikeMusicVideoBytes,
  musicModelMultiplier,
  musicModelTokenPrices,
  musicPromptWithVocal,
  fallbackMusicModes,
  musicModeAllowsAutoDuration,
  musicModelSupportsMode,
  musicVideoDurationFits,
  musicVideoFileLabel,
} from "../src/lib/catalog/music-studio.ts";
import {
  dataUrlDecodedBytes,
  motionControlClipIssue,
  motionControlDurationFromClip,
  motionControlRequestDuration,
  studioIntegratorMode,
  splitVideoPrompt,
  videoCapabilityTags,
  videoPromptAdvisoryChars,
  videoPromptMaxChars,
  videoUserPromptMaxChars,
  videoUserPromptHardChars,
  videoPromptLimits,
  filterVideoModels,
  videoOpenChoices,
  videoV2vAcceptsPhotos,
  videoModelSupportsCharacter,
} from "../src/lib/catalog/video-studio.ts";
import { sortStudioSizes } from "../src/lib/catalog/studio-size.ts";
import { musicRatingFor } from "../src/lib/catalog/music-rating-seed.ts";
import { videoRatingFor } from "../src/lib/catalog/video-rating-seed.ts";
import { readFile } from "node:fs/promises";

test("MiniMax music uses multiplier 2 and USD-per-second prices", () => {
  assert.equal(musicModelMultiplier("minimax", 9), 2);
  assert.equal(musicModelMultiplier("mureka", 3), 3);
  assert.equal(estimateMusicCostUsd({
    billing_unit: "audio_second",
    price_per_second_usd: 0.002,
    default_duration: 60,
  }, 60), 0.12);
  const priced = musicModelTokenPrices({
    duration_control: false,
    default_duration: 180,
    billing_unit: "track",
    price_per_track_usd: 0.15,
  }, 2);
  assert.equal(priced.token_price_auto != null, true);
  assert.deepEqual(priced.token_prices, { 180: priced.token_prices[180] });
});

test("MiniMax vocal button is written into the prompt", () => {
  assert.equal(
    musicPromptWithVocal("minimax", "warm pop song", "female", "song"),
    "warm pop song\nVocals: female lead vocals.",
  );
  assert.equal(musicPromptWithVocal("minimax", "beat", "male", "instrumental"), "beat");
  assert.equal(musicPromptWithVocal("mureka", "warm pop song", "female", "song"), "warm pop song");
});

test("Kling motion control bills duration from the uploaded clip", () => {
  const model = {
    provider: "kling",
    id: "kling-3.0-mc-pro",
    label: "Kling",
    modes: ["motion-control"],
    motion_control: true,
    durations: [5, 6, 7, 8, 9, 10],
    video_to_video: { min_duration_sec: 4, max_duration_sec: 10, max_file_bytes: 50 * 1024 * 1024 },
  };
  assert.equal(motionControlDurationFromClip(model, 5), 5);
  assert.equal(motionControlDurationFromClip(model, 5.1), 6);
  assert.equal(motionControlDurationFromClip(model, 10), 10);
  assert.equal(motionControlDurationFromClip(model, 3.5), null);
  assert.equal(motionControlDurationFromClip(model, 12), null);
  assert.equal(motionControlClipIssue(model, 1_000_000, 7.2), null);
  assert.equal(motionControlClipIssue(model, 1_000_000, 3), "duration-short");
  assert.equal(motionControlClipIssue(model, 1_000_000, 12), "duration-long");
  assert.equal(motionControlClipIssue(model, 20_000_000, 7), "size");
  assert.equal(motionControlRequestDuration(model, 7.2, 1_000_000), 8);
  assert.equal(dataUrlDecodedBytes("data:video/mp4;base64,AAAA"), 3);
});

test("Kling motion control and Seedance sit in video-to-video", () => {
  const kling = { provider: "kling", id: "kling-3.0-mc-pro", label: "Kling", modes: ["motion-control"], motion_control: true };
  const seedance = { provider: "bytedance", id: "seedance-2.5", label: "Seedance", modes: ["text-to-video", "video-to-video"], person_in_video: true };
  const hailuo = { provider: "minimax", id: "hailuo-3", label: "Hailuo", modes: ["video-to-video"] };
  assert.equal(studioIntegratorMode("v2v", kling), "motion-control");
  assert.equal(studioIntegratorMode("v2v", seedance), "video-to-video");
  assert.equal(videoV2vAcceptsPhotos(kling), true);
  assert.equal(videoV2vAcceptsPhotos(seedance), true);
  assert.equal(videoV2vAcceptsPhotos(hailuo), false);
  assert.ok(videoCapabilityTags(["motion-control"], ["on"]).includes("v2v"));
});

test("Wan 3.0 stays out of video-to-video while its OpenRouter route rejects video references", () => {
  const wan = {
    provider: "alibaba",
    id: "wan-3.0",
    label: "Wan 3.0",
    modes: ["ref-to-video", "video-to-video"],
    person_in_video: true,
    max_reference_images: 4,
    generation_mode_limits: { "video-to-video": { max_references: 4, person_in_video: true } },
  };
  assert.equal(studioIntegratorMode("i2v", wan), "ref-to-video");
  assert.equal(studioIntegratorMode("v2v", wan), null);
  assert.equal(filterVideoModels([wan], { mode: "v2v", duration: 8 }).length, 0);
  assert.equal(videoV2vAcceptsPhotos(wan), false);
});

test("saved character sheets are offered to every model with a reference-video slot", () => {
  const seedance = { provider: "bytedance", id: "seedance-2.0-fast", modes: ["ref-to-video"], person_in_video: true, max_reference_images: 9 };
  const omni = { provider: "google", id: "omni-1.1-flash", modes: ["ref-to-video"], person_in_video: false, max_reference_images: 6 };
  assert.equal(videoModelSupportsCharacter(seedance), true);
  assert.equal(videoModelSupportsCharacter(omni), true);
  assert.equal(videoModelSupportsCharacter({ ...seedance, max_reference_images: 2 }), true);
  assert.equal(videoModelSupportsCharacter({ ...seedance, max_reference_images: 0 }), false);
  assert.equal(videoModelSupportsCharacter({ ...seedance, modes: ["image-to-video"] }), false);
});

test("video prompt limits come from the Integrator catalog", () => {
  assert.equal(videoPromptMaxChars({ max_prompt_chars: 2_500 }), 2_500);
  assert.equal(videoPromptMaxChars({ max_prompt_chars: 20_000 }), 20_000);
  assert.equal(videoPromptMaxChars({ max_prompt_chars: null }), 8_000);
  assert.equal(videoUserPromptMaxChars({ max_prompt_chars: 5_000 }, 80), 4_920);
  assert.equal(videoPromptAdvisoryChars({ provider: "alibaba", id: "wan-2.7", max_prompt_chars: 8_000, provider_prompt_limit: { max_chars: 5_000 } }), 5_000);
  assert.equal(videoPromptAdvisoryChars({ provider: "google", id: "veo-3.1", max_prompt_chars: 8_000, provider_prompt_limit: { max_tokens: 1_024 } }), 4_096);
  assert.equal(videoPromptAdvisoryChars({ provider: "bytedance", id: "seedance-2.0-fast", max_prompt_chars: 20_000 }), 5_000);
  assert.deepEqual(videoPromptLimits({ provider: "minimax", id: "hailuo-3", max_prompt_chars: 1 }), { hard: 10_000, recommended: 7_000 });
  assert.deepEqual(videoPromptLimits({ provider: "minimax", id: "hailuo-2.3", max_prompt_chars: 1 }), { hard: 8_000, recommended: 2_000 });
  assert.deepEqual(videoPromptLimits({ provider: "bytedance", id: "seedance-2.5", max_prompt_chars: 1 }), { hard: 8_000, recommended: 5_000 });
  assert.deepEqual(videoPromptLimits({ provider: "bytedance", id: "seedance-1-5-pro", max_prompt_chars: 1 }), { hard: 8_000, recommended: 4_000 });
  assert.deepEqual(videoPromptLimits({ provider: "kling", id: "future-kling", max_prompt_chars: 1 }), { hard: 8_000, recommended: 2_500 });
  assert.deepEqual(videoPromptLimits({ provider: "bfl", id: "flux-3-video", max_prompt_chars: 1 }), { hard: 20_000, recommended: 8_000 });
  assert.deepEqual(videoPromptLimits({ provider: "runway", id: "gen-4.5", max_prompt_chars: 1 }), { hard: 8_000, recommended: 2_500 });
  assert.deepEqual(videoPromptLimits({ provider: "google", id: "omni-1.1-flash", max_prompt_chars: 1 }), { hard: 20_000, recommended: 8_000 });
  assert.equal(videoUserPromptHardChars({ provider: "bytedance", id: "seedance-2.0-fast", max_prompt_chars: 20_000 }, 80), 7_920);
  assert.deepEqual(splitVideoPrompt("123456", 4), { accepted: "1234", overflow: "56" });
});

test("video API preserves the original prompt in history and trims only the provider payload", async () => {
  const route = await readFile(new URL("../src/app/api/video/generations/route.ts", import.meta.url), "utf8");
  assert.match(route, /const combinedPrompt = videoAgent\?\.systemPrompt\.trim\(\)/);
  assert.match(route, /promptForTransfer = combinedPrompt\.slice\(0, videoUserPromptHardChars/);
  assert.match(route, /insertVideoJob\(\{[\s\S]*?\n\s+prompt,\n/);
  assert.match(route, /executeVideoJob\(\{[\s\S]*?prompt: promptForTransfer/);
  const modeIndex = route.indexOf("const mode = studioIntegratorMode");
  const wanGuardIndex = route.indexOf('catalogModel.id === "wan-3.0"');
  const insertIndex = route.indexOf("insertVideoJob({");
  assert.ok(modeIndex < wanGuardIndex);
  assert.ok(wanGuardIndex < insertIndex);
});

test("new MiniMax and Kling models have rating seeds", () => {
  assert.ok(musicRatingFor("music-2.6").score > 1200);
  assert.ok(videoRatingFor("kling-3.0-mc-pro").score > 1200);
  assert.ok(musicRatingFor("v1.1-video").score > 1500);
});

test("Sonilo and Mureka O2 stay in the modes they can actually run", () => {
  assert.deepEqual(fallbackMusicModes("v1.1-text"), ["instrumental"]);
  assert.deepEqual(fallbackMusicModes("v1.1-video"), ["instrumental"]);
  assert.deepEqual(fallbackMusicModes("mureka-o2"), ["song"]);
  assert.deepEqual(fallbackMusicModes("music-3"), ["song", "instrumental"]);
  assert.equal(musicModelSupportsMode({ modes: ["instrumental"] }, "song"), false);
  assert.equal(musicModelSupportsMode({ modes: ["song"] }, "instrumental"), false);
  assert.equal(musicModeAllowsAutoDuration([
    { modes: ["instrumental"], duration_control: true },
    { modes: ["song"], duration_control: false },
  ], "instrumental"), false);
});

test("Sonilo soundtrack clip length and file type are checked", () => {
  assert.equal(clampMusicVideoDuration(47.4), 47);
  assert.equal(isAllowedMusicVideoType("video/mp4"), true);
  assert.equal(isAllowedMusicVideoType("image/png"), false);
  assert.equal(isAllowedMusicVideoFile({ name: "scene.mov", type: "" }), true);
  assert.equal(isAllowedMusicVideoFile({ name: "track.mp3", type: "audio/mpeg" }), false);
  assert.equal(looksLikeMusicVideoBytes(Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])), true);
  assert.equal(looksLikeMusicVideoBytes(Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0])), false);
  assert.equal(musicVideoFileLabel("night-drive-final.mp4"), "night-drive-final");
  assert.equal(musicVideoDurationFits({ durations: [30, 60, 90, 600] }, 47), true);
  assert.equal(musicVideoDurationFits({ durations: [30, 60, 90, 600] }, 9), false);
});

test("unused video filters keep every size and format for the duration", () => {
  const models = [
    { provider: "kling", id: "low", label: "Low", modes: ["text-to-video"], durations: [6], resolutions: ["360"], aspect_ratios: ["16:9", "1:1"], sound_modes: ["off"] },
    { provider: "google", id: "hi", label: "Hi", modes: ["text-to-video"], durations: [6], resolutions: ["720", "1080"], aspect_ratios: ["9:16"], sound_modes: ["on"] },
  ];
  const open = videoOpenChoices(models, { mode: "t2v", duration: 6 });
  assert.deepEqual([...open.resolutions].sort(), ["1080", "360", "720"]);
  assert.ok(["360", "720", "1080"].every((item) => open.resolutions.includes(item)));
  assert.ok(["16:9", "1:1", "9:16"].every((item) => open.aspects.includes(item)));
  assert.deepEqual([...open.providers].sort(), ["google", "kling"]);
  const afterSize = videoOpenChoices(models, { mode: "t2v", duration: 6, resolution: "360" });
  assert.ok(["16:9", "1:1"].every((item) => afterSize.aspects.includes(item)));
  assert.equal(afterSize.aspects.includes("9:16"), false);
  assert.deepEqual(afterSize.providers, ["kling"]);
});

test("studio sizes go from smallest to largest", () => {
  assert.deepEqual(sortStudioSizes(["4K", "360p", "1080p", "720p", "2K", "480p"]), ["360p", "480p", "720p", "1080p", "2K", "4K"]);
  assert.deepEqual(sortStudioSizes(["2K", "0.5K", "4K", "1K"]), ["0.5K", "1K", "2K", "4K"]);
});
