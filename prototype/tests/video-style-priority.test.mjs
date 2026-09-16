import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  applyVideoStylePriority,
  videoStyleById,
  videoStylePromptExtraChars,
} from "../src/lib/i18n/copy/video-styles.ts";
import { videoPromptMaxChars, videoUserPromptMaxChars } from "../src/lib/catalog/video-studio.ts";

test("selected video style overrides conflicting user style", () => {
  const userPrompt = "Photorealistic daytime city, static camera, cold neutral light.";
  const selected = videoStyleById("ru", "anime");
  const result = applyVideoStylePriority(userPrompt, "ru", "anime");

  assert.ok(selected);
  assert.ok(result.startsWith("<user_description>\n"));
  assert.ok(result.indexOf(selected.prompt) > result.indexOf(userPrompt), "the mandatory style must be the final instruction");
  assert.match(result, /overrides any conflicting style, lighting, color, rendering, camera, motion, or atmosphere/);
  assert.match(result, /<user_description>\nPhotorealistic daytime city/);
  assert.ok(result.endsWith("</selected_video_style>"));
  assert.equal(applyVideoStylePriority(result, "ru", "anime"), result, "composition must be idempotent");
  assert.equal(videoStylePromptExtraChars("ru", "anime"), result.length - userPrompt.length);
  assert.equal(
    videoUserPromptMaxChars({ max_prompt_chars: 7_000 }, videoStylePromptExtraChars("ru", "anime")) + videoStylePromptExtraChars("ru", "anime"),
    videoPromptMaxChars({ max_prompt_chars: 7_000 }),
  );
});

test("provider prompt preserves the complete user text beyond the advisory model limit", () => {
  const limit = 2_500;
  const prompt = "A".repeat(8_000);
  const result = applyVideoStylePriority(prompt, "en", "cinematic");
  assert.ok(result.length > limit);
  assert.match(result, new RegExp(`<user_description>\\n${prompt}\\n</user_description>`));
  assert.match(result, /<selected_video_style id="cinematic" priority="highest">/);
  assert.ok(result.endsWith("</selected_video_style>"));
});

test("automatic style leaves the user prompt unchanged", () => {
  assert.equal(applyVideoStylePriority("  A calm lake  ", "en", "auto"), "A calm lake");
});

test("legacy browser prompt is normalized without duplicating the selected style", () => {
  const selected = videoStyleById("en", "cinematic");
  assert.ok(selected);
  const result = applyVideoStylePriority(`A runner at sunrise\n${selected.prompt}`, "en", "cinematic");
  assert.equal(result.match(new RegExp(selected.prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length, 1);
  assert.match(result, /^<user_description>\nA runner at sunrise\n<\/user_description>/);
});

test("server composes the authoritative style immediately before provider dispatch", async () => {
  const server = await readFile(new URL("../src/lib/server/video-jobs.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/video/generations/route.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");

  assert.match(server, /prompt: applyVideoStylePriority\(input\.prompt, usageHistoryLocale\(input\.locale\), input\.style\)/);
  assert.doesNotMatch(server, /applyVideoStyleWithinLimit|maxPromptChars|\.slice\(0,.*limit/i);
  assert.match(route, /style !== "auto" && !videoStyleById\(locale, style\)/);
  assert.doesNotMatch(route, /maxPromptChars|promptLimit/);
  assert.doesNotMatch(route, /promptTooLong\(promptLimit\)/);
  assert.match(client, /prompt: userPrompt,\n\s+locale,/);
  assert.doesNotMatch(client, /prompt: effectivePrompt,/);
  assert.doesNotMatch(client, /maxLength=\{promptMax\}/);
  assert.doesNotMatch(client, /setPrompt\(value\.slice\(0, promptMax\)\)/);
  assert.match(client, /text-destructive">\{parts\.overflow\}/);
});
