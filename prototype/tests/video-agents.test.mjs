import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { getAgentById } from "../src/lib/mock/agents.ts";
import { isSystemAgentTag, systemAgentTagOptions } from "../src/lib/system-agent-kind.ts";
import { VIDEO_AGENT_TAGS, videoAgentCopy, videoAgentDefaults, videoAgentMinUserReferences, videoAgentNeedsUserPrompt, videoAgentRequiresMotionControlInputs, videoAgentTagLabel } from "../src/lib/video-agent-catalog.ts";

test("video-agent categories are available in catalog and admin", () => {
  assert.deepEqual([...systemAgentTagOptions("video")], [...VIDEO_AGENT_TAGS]);
  for (const tag of VIDEO_AGENT_TAGS) assert.equal(isSystemAgentTag("video", tag), true, tag);
  assert.ok(VIDEO_AGENT_TAGS.includes("luxury-life"));
  assert.ok(VIDEO_AGENT_TAGS.includes("birthday"));
  assert.equal(videoAgentTagLabel("ru", "luxury-life"), "Роскошная жизнь");
  assert.equal(videoAgentTagLabel("en", "birthday"), "Happy birthday");
});

test("public agent catalog exposes the video category", async () => {
  const source = await readFile(new URL("../src/components/agents/agents-page-content.tsx", import.meta.url), "utf8");
  assert.match(source, /type CatalogFilter = AgentKind \| "mine"/);
  assert.match(source, /video: Clapperboard/);
  assert.match(source, /\{ id: "video", label: t\.agents\.filterVideo \}/);
});

test("weather-change is an 8-second vertical V2V agent with a changeable recommendation", async () => {
  const agent = getAgentById("weather-change");
  const defaults = videoAgentDefaults("weather-change");
  assert.equal(agent?.category, "video");
  assert.equal(defaults?.providerId, "google");
  assert.equal(defaults?.modelId, "omni-1.1-flash");
  assert.equal(defaults?.videoMode, "v2v");
  assert.deepEqual(defaults?.videoSettings, { duration: 8, resolution: "720p", aspectRatio: "9:16", sound: "off", style: "auto" });
  assert.equal(videoAgentCopy("weather-change", "ru")?.placeholder, "Укажите, какую погоду создать");
  const full = await stat(new URL("../public/agents/video/weather-change/weather-change.mp4", import.meta.url));
  const preview = await stat(new URL("../public/agents/video/weather-change/weather-change-preview.mp4", import.meta.url));
  assert.ok(full.size > 1_000_000, "full asset remains the generated motion video, not a tiny still montage");
  assert.ok(preview.size > 0);
  assert.ok(preview.size < full.size / 4, "hover preview remains lightweight");
});

test("glasses logo promo keeps the supplied script hidden and asks only for a brand", async () => {
  const agent = getAgentById("glasses-logo-promo");
  const defaults = videoAgentDefaults("glasses-logo-promo");
  assert.equal(agent?.category, "video");
  assert.equal(defaults?.tag, "promo");
  assert.equal(defaults?.providerId, "bytedance");
  assert.equal(defaults?.modelId, "seedance-2.0-fast");
  assert.equal(defaults?.videoMode, "t2v");
  assert.deepEqual(defaults?.videoSettings, { duration: 10, resolution: "480p", aspectRatio: "1:1", sound: "on", style: "auto" });
  assert.equal(videoAgentCopy("glasses-logo-promo", "ru")?.placeholder, "Укажите только название бренда");
  assert.match(agent?.systemPrompt ?? "", /entire request is the exact brand name/i);
  assert.doesNotMatch(agent?.systemPrompt ?? "", /Genora.art/);
  const full = await stat(new URL("../public/agents/video/glasses-logo-promo/glasses-logo-promo.mp4", import.meta.url));
  const preview = await stat(new URL("../public/agents/video/glasses-logo-promo/glasses-logo-promo-preview.m4v", import.meta.url));
  assert.ok(preview.size > 0 && preview.size < full.size / 4);
});

test("angel is a six-second full-body I2V agent with an optional user prompt", async () => {
  const agent = getAgentById("angel");
  const defaults = videoAgentDefaults("angel");
  assert.equal(agent?.category, "video");
  assert.equal(defaults?.tag, "entertainment");
  assert.equal(defaults?.providerId, "bytedance");
  assert.equal(defaults?.modelId, "seedance-2.0-fast");
  assert.equal(defaults?.videoMode, "i2v");
  assert.equal(defaults?.minUserReferences, 1);
  assert.equal(defaults?.maxUserReferences, 1);
  assert.equal(videoAgentMinUserReferences("angel"), 1);
  assert.equal(videoAgentNeedsUserPrompt("angel"), false);
  assert.deepEqual(defaults?.videoSettings, { duration: 6, resolution: "480p", aspectRatio: "9:16", sound: "on", style: "auto" });
  assert.match(agent?.systemPrompt ?? "", /sole identity reference/i);
  assert.match(agent?.systemPrompt ?? "", /00:00\.000–00:06\.000/);
  assert.match(videoAgentCopy("angel", "ru")?.guideNotice ?? "", /полный рост/i);
  for (const path of [
    "../public/agents/video/angel/angel.mp4",
    "../public/agents/video/angel/angel-preview.m4v",
    "../public/agents/video/angel/angel-poster.jpg",
    "../public/agents/video/angel/angel-reference-good.jpg",
    "../public/agents/video/angel/angel-reference-bad.jpg",
  ]) assert.ok((await stat(new URL(path, import.meta.url))).size > 0, path);
});

test("Michael Jackson dance pins the Kling provider, allows Kling Motion Control models, and localizes the full-body workflow", () => {
  const id = "michael-jackson-dance";
  const agent = getAgentById(id);
  const defaults = videoAgentDefaults(id);
  assert.equal(agent?.category, "video");
  assert.equal(agent?.name, "Michael Jackson Dance");
  assert.equal(defaults?.tag, "animate-photo");
  assert.equal(defaults?.providerId, "kling");
  assert.equal(defaults?.modelId, "kling-2.6-mc-std", "default recommendation only; the user may choose another Kling Motion Control model");
  assert.equal(defaults?.videoMode, "v2v");
  assert.equal(defaults?.maxUserReferences, 2);
  assert.equal(defaults?.videoPreviewUrl, null, "don't present the source dance clip as the child-result preview");
  assert.equal(videoAgentRequiresMotionControlInputs(id), true);
  assert.equal(videoAgentNeedsUserPrompt(id), false);
  assert.equal(videoAgentMinUserReferences(id), 1);
  assert.match(agent?.systemPrompt ?? "", /motion reference/i);
  assert.match(agent?.systemPrompt ?? "", /exact first frame/i);
  assert.match(agent?.systemPrompt ?? "", /clothing, footwear, accessories, background, lighting/i);
  assert.match(agent?.systemPrompt ?? "", /Change only the person's movement/i);
  assert.match(agent?.systemPrompt ?? "", /age-appropriate and non-sexual/i);
  for (const locale of ["ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"]) {
    const copy = videoAgentCopy(id, locale);
    assert.ok(copy?.name && copy?.description && copy?.placeholder && copy?.guideNotice, locale);
  }
  assert.match(videoAgentCopy(id, "en")?.placeholder ?? "", /full-body photo/i);
  assert.match(videoAgentCopy(id, "ru")?.placeholder ?? "", /полный рост/i);
});

test("built-in video agent copy is localized for every served locale", () => {
  const locales = ["ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"];
  for (const locale of locales) {
    assert.ok(videoAgentCopy("glasses-logo-promo", locale)?.name, locale);
    assert.ok(videoAgentCopy("angel", locale)?.guideNotice, locale);
  }
});

test("server resolution supports video agents created only in admin", async () => {
  const source = await readFile(new URL("../src/lib/server/system-agents.ts", import.meta.url), "utf8");
  assert.match(source, /override\?\.created \|\| override\.category !== "video"/);
  assert.match(source, /return resolved\.videoMode \? resolved : null/);
});

test("selected video agent is shown inside the prompt box as a removable name chip", async () => {
  const source = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const promptBox = source.slice(source.indexOf('selectedVideoAgent ? "border-accent-brand'), source.indexOf("<VideoPromptTextarea", source.indexOf('selectedVideoAgent ? "border-accent-brand')));
  assert.match(promptBox, /videoAgentCopy\(selectedVideoAgent\.id, locale\)\?\.name/);
  assert.match(promptBox, /onSelectedVideoAgentChange\(""\)/);
  assert.doesNotMatch(promptBox, /selectedVideoAgent\.description/);
});

test("angel guide matches the common compact photo guide and requires one reference", async () => {
  const source = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /selectedVideoAgent\?\.guide/);
  assert.match(source, /selectedVideoAgent\.guide\.goodImageUrl/);
  assert.match(source, /selectedVideoAgent\.guide\.badImageUrl/);
  assert.match(source, /\{UI\.exampleGood\}/);
  assert.match(source, /\{UI\.exampleBad\}/);
  assert.match(source, /selectedVideoAgent\.videoUrl/);
  assert.match(source, /\{UI\.guideClose\}/);
  assert.match(source, /userPromptRequired && !prompt\.trim\(\)/);
  assert.match(source, /!agentReferencesReady/);
  assert.match(source, /minUserReferences/);
  assert.match(source, /maxUserReferences/);
});

test("server composes hidden agent prompts without exposing or requiring angel text", async () => {
  const source = await readFile(new URL("../src/app/api/video/generations/route.ts", import.meta.url), "utf8");
  assert.match(source, /videoAgentNeedsUserPrompt/);
  assert.match(source, /prompt\s*\?\s*`\$\{videoAgent\.systemPrompt\.trim\(\)\}/);
  assert.match(source, /: videoAgent\.systemPrompt\.trim\(\)/);
  assert.match(source, /agentId === "angel" \? "" : rawPrompt/);
  assert.match(source, /videoAgentMinUserReferences/);
  assert.match(source, /userReferenceCount < videoAgentMinUserReferences/);
  assert.match(source, /provider !== pinnedDefaults\.providerId \|\| uiMode !== pinnedDefaults\.videoMode/);
  assert.doesNotMatch(source, /model !== pinnedDefaults\.modelId/);
  assert.match(source, /requiresMotionControl && \(/);
  assert.match(source, /studioIntegratorMode\(uiMode, catalogModel\) !== "motion-control"/);
  assert.match(source, /firstFrame: mode === "image-to-video" \|\| mode === "motion-control" \? \(firstFrame \|\| references\[0\]\)/);
});
