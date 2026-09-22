import assert from "node:assert/strict";
import test from "node:test";
import { access } from "node:fs/promises";

import { IMAGE_AGENT_RESULT_PROMPTS } from "../src/lib/image-agent-result-prompts.ts";
import { imageAgentGuideNotice, imageAgentHidesGuideUpload, imageAgentMultiGuide, imageAgentRatedGuide } from "../src/lib/image-agent-guides.ts";
import { imageAgentComposerCopy } from "../src/lib/i18n/copy/image-agent-composer-copy.ts";
import { filterModelsForMinReferences, imageAgentMinReferences, modelSupportsMinReferences } from "../src/lib/image-agent-models.ts";
import {
  CLOTHES_AGENT_IDS,
  HAIR_AGENT_IDS,
  IMAGE_AGENT_TAG_OF,
  LOCATION_AGENT_IDS,
  PHOTO_EFFECT_AGENT_IDS,
  WEATHER_AGENT_IDS,
  imageAgentGuideAssets,
  imageAgentMatchesTag,
  imageAgentPreferredStyle,
  imageAgentRequiresPhoto,
  imageAgentUsesOldGuide,
} from "../src/lib/image-agent-gallery.ts";
import { defaultImageAgentVariant, imageAgentVariantNotes, imageAgentVariants, imageStudioQueryKey, liveImageStudioQuery } from "../src/lib/image-agent-variants.ts";
import { imageAgentPreset } from "../src/lib/image-agent-presets.ts";
import { agentDescription, agentName } from "../src/lib/mock/agents.ts";
import {
  IMAGE_AGENT_EXPANSION_IDS,
  PHOTO_POSE_AGENTS,
  PHOTO_POSE_AGENT_IDS,
  SCENE_PHOTO_AGENT_IDS,
  imageAgentExpansionCopy,
} from "../src/lib/image-agent-expansions.ts";

test("image agents that need a photo keep the reminder", () => {
  assert.equal(imageAgentRequiresPhoto("natural-retouch"), true);
  assert.equal(imageAgentRequiresPhoto("background-removal"), true);
  assert.equal(imageAgentRequiresPhoto("logo-generator"), false);
  assert.equal(imageAgentRequiresPhoto("business-card"), false);
  assert.equal(imageAgentRequiresPhoto("brand-style-mini"), false);
  assert.equal(imageAgentRequiresPhoto(""), false);
});

test("existing agents map onto the shared gallery tags", () => {
  assert.equal(IMAGE_AGENT_TAG_OF["privacy-redaction"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["natural-retouch"], "face-retouch");
  assert.equal(IMAGE_AGENT_TAG_OF["background-removal"], "background");
  assert.equal(IMAGE_AGENT_TAG_OF["business-outfit"], "clothes");
  assert.equal(IMAGE_AGENT_TAG_OF["logo-generator"], "design");
  assert.equal(imageAgentMatchesTag("pro-headshot", "all"), true);
  assert.equal(imageAgentMatchesTag("pro-headshot", "face-retouch"), true);
  assert.equal(imageAgentMatchesTag("pro-headshot", "design"), false);
});

test("cover after-prompts stay English and accept user notes", () => {
  for (const [id, prompt] of Object.entries(IMAGE_AGENT_RESULT_PROMPTS)) {
    assert.match(prompt, /{{USER_NOTES}}/, id);
    assert.match(prompt, /{{FORMAT}}/, id);
    assert.equal(/[А-Яа-яЁё]/.test(prompt), false, id);
  }
});

test("guide popup can show before/after or the still result", () => {
  assert.equal(imageAgentGuideAssets("natural-retouch").after, "/agents/natural-retouch-after.jpg");
  assert.equal(imageAgentGuideAssets("logo-generator").still, "/agents/logo-generator.jpg");
});

test("logo generator returns one five-application identity grid", () => {
  const prompt = IMAGE_AGENT_RESULT_PROMPTS["logo-generator"];
  assert.match(prompt, /EXACTLY FIVE logo applications/);
  assert.match(prompt, /DARK WEBSITE LOCKUP/);
  assert.match(prompt, /DARK STACKED LOCKUP/);
  assert.match(prompt, /LIGHT WEBSITE LOCKUP/);
  assert.match(prompt, /LIGHT STACKED LOCKUP/);
  assert.match(prompt, /FAVICON/);
  assert.match(prompt, /same mark, wordmark, typography, proportions and brand colors must remain identical/);
  assert.match(prompt, /exact brand name and spelling supplied by the user/);
  assert.match(prompt, /exactly five tiles/);
});

test("background replace keeps a default scene when notes are empty", () => {
  const prompt = IMAGE_AGENT_RESULT_PROMPTS["background-replace"];
  assert.match(prompt, /DEFAULT BACKGROUND/);
  assert.match(prompt, /{{USER_NOTES}}/);
});

test("GTA filter uses one photo, background tag and a fixed bottom-right badge", () => {
  assert.equal(IMAGE_AGENT_TAG_OF["gta-filter"], "background");
  assert.equal(imageAgentRequiresPhoto("gta-filter"), true);
  assert.equal(imageAgentUsesOldGuide("gta-filter"), false);
  assert.equal(imageAgentGuideAssets("gta-filter").before, "/agents/gta-filter-before.jpg");
  assert.equal(imageAgentGuideAssets("gta-filter").after, "/agents/gta-filter-after.jpg");
  assert.equal(imageAgentGuideNotice("gta-filter", "ru"), "Для этого агента требуется только одно фото.");
  assert.equal(imageAgentGuideNotice("gta-filter", "en"), "This agent requires only one photo.");
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["gta-filter"], /Grand Theft Auto V/);
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["gta-filter"], /bottom-right corner/);
  assert.deepEqual(imageAgentPreset("gta-filter"), { provider: "openai", modelId: "gpt-image-2", size: "1K", format: "1:1", style: "illustration" });
  assert.equal(imageAgentPreferredStyle("gta-filter"), "illustration");
});

test("character card has three real source examples and a recommended editable preset", () => {
  const guide = imageAgentMultiGuide("character-card");
  assert.deepEqual(guide?.sources, [
    "/agents/character-card-before.jpg",
    "/agents/character-card-profile.jpg",
    "/agents/character-card-full-body.jpg",
  ]);
  assert.equal(guide?.result, "/agents/character-card-after.jpg");
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["character-card"], /true head-to-toe full-body views/);
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["character-card"], /Never crop the head, hands, knees, legs, ankles, feet or shoes/);
  assert.deepEqual(imageAgentPreset("character-card"), { provider: "google", modelId: "gemini-3.1-flash-image", size: "2K", format: "1:1", style: "photorealistic" });
});

test("selected agent or template can be reset from inside the composer", async () => {
  const studio = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8"));
  assert.match(studio, /const resetAgentOrTemplate = \(\) =>/);
  assert.match(studio, /onClick=\{resetAgentOrTemplate\}/);
  assert.match(studio, /setAgentId\(""\)[\s\S]+setTemplateId\(""\)[\s\S]+setPhotoMode\("t2i"\)/);
  assert.match(studio, /if \(requested\) \{[\s\S]+applyAgentPreset\(requested, catalogData\.models\);[\s\S]+if \(!agentIdRef\.current\)/);
});

test("new photo agents sit on the expected tags", () => {
  assert.equal(IMAGE_AGENT_TAG_OF["restore-old-photo"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["character-card"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["ai-character-card"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["family-photo"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["combine-photos"], "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF.sunflowers, "photo-processing");
  assert.equal(IMAGE_AGENT_TAG_OF["add-makeup"], "face-retouch");
  assert.equal(IMAGE_AGENT_TAG_OF["old-age"], "face-retouch");
  assert.equal(imageAgentMatchesTag("old-age", "face-retouch"), true);
  assert.equal(imageAgentMatchesTag("plump-lips", "face-retouch"), true);
  assert.equal(imageAgentRequiresPhoto("remove-objects"), true);
  assert.equal(imageAgentRequiresPhoto("family-photo"), true);
  assert.equal(imageAgentRequiresPhoto("ai-character-card"), false);
});

test("photo-pose and scene agents have complete localized gallery contracts", async () => {
  assert.equal(PHOTO_POSE_AGENTS.filter((item) => item.id.startsWith("pose-male-")).length, 8);
  assert.equal(PHOTO_POSE_AGENTS.filter((item) => item.id.startsWith("pose-female-")).length, 10);
  assert.equal(SCENE_PHOTO_AGENT_IDS.length, 7);
  for (const id of IMAGE_AGENT_EXPANSION_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], PHOTO_POSE_AGENT_IDS.includes(id) ? "photo-poses" : "photo-processing", id);
    assert.equal(imageAgentRequiresPhoto(id), true, id);
    assert.deepEqual(imageAgentPreset(id), { provider: "openai", modelId: "gpt-image-2", size: "1.5K", format: "2:3", style: "photorealistic" }, id);
    assert.match(IMAGE_AGENT_RESULT_PROMPTS[id], /{{STYLE}}/, id);
    assert.match(IMAGE_AGENT_RESULT_PROMPTS[id], /{{USER_NOTES}}/, id);
    const rated = imageAgentRatedGuide(id);
    assert.equal(rated?.uploadFromGuide, true, id);
    assert.equal(rated?.objectFit, "contain", id);
    for (const locale of ["ru", "en"]) {
      const copy = imageAgentExpansionCopy(locale, id);
      assert.ok(copy?.name, `${locale}:${id}`);
      assert.ok(copy.name.trim().split(/\s+/).length <= 2, `${locale}:${id}:${copy.name}`);
      assert.ok(copy.description, `${locale}:${id}:description`);
    }
    for (const suffix of ["before.jpg", "after.jpg", "bad.jpg", "thumbs/" + id + "-before.webp", "thumbs/" + id + "-after.webp"]) {
      const file = suffix.startsWith("thumbs/") ? suffix : `${id}-${suffix}`;
      await access(new URL(`../public/agents/${file}`, import.meta.url));
    }
  }
});

test("localized card labels override stored Russian image-agent values", () => {
  const locales = ["en", "hi", "es", "fr", "ar", "pt", "de", "it", "tr", "pl", "sv", "cs"];
  for (const locale of locales) {
    for (const id of IMAGE_AGENT_EXPANSION_IDS) {
      assert.equal(/[А-Яа-яЁё]/.test(`${agentName(id, locale)} ${agentDescription(id, locale)}`), false, `${locale}:${id}`);
    }
  }
});

test("AI character agent has a generated gallery thumbnail", async () => {
  await access(new URL("../public/agents/thumbs/ai-character-card.webp", import.meta.url));
});

test("multi-photo agents show labeled examples and hide the plus in the bell", () => {
  const family = imageAgentMultiGuide("family-photo");
  assert.equal(family?.sources.length, 3);
  assert.equal(family?.result, "/agents/family-photo-after.jpg");
  assert.equal(imageAgentMultiGuide("combine-photos")?.sources.length, 2);
  assert.equal(imageAgentMultiGuide("sunflowers")?.sources[1], "/agents/sunflowers-2.jpg");
  assert.equal(imageAgentHidesGuideUpload("family-photo"), true);
  assert.equal(imageAgentHidesGuideUpload("natural-retouch"), false);
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["family-photo"], /{{PHOTO_LIST}}/);
  assert.match(IMAGE_AGENT_RESULT_PROMPTS["combine-photos"], /DEFAULT POSE/);
  assert.match(IMAGE_AGENT_RESULT_PROMPTS.sunflowers, /USER ADDITIONS/);
});

test("makeup and lips expose selectable variants", () => {
  assert.equal(imageAgentVariants("add-makeup").length, 3);
  assert.equal(imageAgentVariants("plump-lips").length, 3);
  assert.equal(defaultImageAgentVariant("add-makeup")?.id, "evening");
  assert.equal(defaultImageAgentVariant("plump-lips")?.id, "medium");
  assert.match(imageAgentVariantNotes("add-makeup", "evening", ""), /Evening glamour/);
  assert.match(imageAgentVariantNotes("plump-lips", "full", "keep smile"), /silicone-model/);
  assert.match(imageAgentVariantNotes("plump-lips", "full", "keep smile"), /keep smile/);
  assert.equal(imageAgentUsesOldGuide("add-makeup"), true);
  assert.equal(imageAgentUsesOldGuide("character-card"), false);
  assert.equal(imageAgentUsesOldGuide("restore-old-photo"), false);
});

test("hair agents sit on the hair tag with old guide and color notes", () => {
  for (const id of HAIR_AGENT_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], "hair", id);
    assert.equal(imageAgentMatchesTag(id, "hair"), true, id);
    assert.equal(imageAgentRequiresPhoto(id), true, id);
    assert.equal(imageAgentUsesOldGuide(id), true, id);
    assert.equal(imageAgentGuideAssets(id).before, `/agents/${id}-before.jpg`, id);
    assert.equal(imageAgentGuideAssets(id).after, `/agents/${id}-after.jpg`, id);
    assert.match(IMAGE_AGENT_RESULT_PROMPTS[id], /keep the (hair|beard) color from the attached photo/i, id);
  }
  assert.match(imageAgentComposerCopy("ru").placeholder.kare, /цвет волос/);
  assert.match(imageAgentComposerCopy("ru").placeholder.stubble, /цвет бороды/);
  assert.match(imageAgentComposerCopy("en").placeholder.bald, /hair color/);
  assert.match(imageAgentComposerCopy("en").placeholder["remove-beard"], /beard color/);
});

test("weather clothes and location agents sit on the expected tags", () => {
  for (const id of WEATHER_AGENT_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], "background", id);
    assert.equal(imageAgentRequiresPhoto(id), true, id);
    assert.equal(imageAgentUsesOldGuide(id), false, id);
    assert.equal(imageAgentGuideAssets(id).before, `/agents/${id}-before.jpg`, id);
    assert.equal(imageAgentGuideAssets(id).after, `/agents/${id}-after.jpg`, id);
  }
  for (const id of CLOTHES_AGENT_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], "clothes", id);
    const rated = imageAgentRatedGuide(id);
    assert.equal(rated?.good.length, 2, id);
    assert.equal(rated?.bad, "/agents/clothes-guide-waist.jpg", id);
    assert.equal(imageAgentHidesGuideUpload(id), true, id);
    assert.equal(imageAgentGuideAssets(id).after, `/agents/${id}-after.jpg`, id);
  }
  for (const id of LOCATION_AGENT_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], "locations", id);
    assert.equal(imageAgentMinReferences(id), 2, id);
    const multi = imageAgentMultiGuide(id);
    assert.equal(multi?.sources.length, 3, id);
    assert.equal(multi?.sources[0], "/agents/location-guide-front.jpg", id);
    assert.equal(multi?.sourceCaption, "good", id);
    assert.equal(multi?.result, `/agents/${id}-after.jpg`, id);
    assert.equal(imageAgentHidesGuideUpload(id), true, id);
  }
  assert.equal(imageAgentMinReferences("rain"), 0);
  assert.equal(imageAgentRatedGuide("rain"), null);
  assert.match(imageAgentComposerCopy("ru").placeholder["business-suit-man"], /цвет костюма/);
  assert.match(imageAgentComposerCopy("en").placeholder["business-suit-woman"], /suit color/);
  assert.match(imageAgentComposerCopy("ru").placeholder["old-age"], /возраст/);
  assert.match(imageAgentComposerCopy("en").placeholder["old-age"], /age/i);
  assert.equal(modelSupportsMinReferences({ input_image: { supported: true }, max_reference_images: 2 }, 2), true);
  assert.equal(modelSupportsMinReferences({ input_image: { supported: true }, max_reference_images: 1 }, 2), false);
  assert.equal(filterModelsForMinReferences([{ input_image: { supported: true }, max_reference_images: 4 }], 2).length, 1);
});

test("photo-effect agents sit on the photo-effects tag with locked styles", () => {
  const styles = {
    "comic-2": "cartoon",
    "fashion-caricature": "illustration",
    "pixel-illustration": "illustration",
    watercolor: "illustration",
    "x-ray": "illustration",
    "cartoon-hero": "cartoon",
    caricature: "illustration",
    "hero-3d": "three_d",
    drawn: "illustration",
    comic: "illustration",
    clay: "three_d",
    "anime-hero": "cartoon",
    fantasy: "illustration",
  };
  assert.deepEqual([...PHOTO_EFFECT_AGENT_IDS], Object.keys(styles));
  for (const id of PHOTO_EFFECT_AGENT_IDS) {
    assert.equal(IMAGE_AGENT_TAG_OF[id], "photo-effects", id);
    assert.equal(imageAgentMatchesTag(id, "photo-effects"), true, id);
    assert.equal(imageAgentRequiresPhoto(id), true, id);
    assert.equal(imageAgentUsesOldGuide(id), false, id);
    assert.equal(imageAgentPreferredStyle(id), styles[id], id);
    assert.equal(imageAgentGuideAssets(id).before, `/agents/${id}-before.jpg`, id);
    assert.equal(imageAgentGuideAssets(id).after, `/agents/${id}-after.jpg`, id);
    if (id !== "fashion-caricature") assert.match(IMAGE_AGENT_RESULT_PROMPTS[id], /Do not change the place/, id);
  }
  assert.equal(imageAgentPreferredStyle("santorini"), null);
  assert.equal(imageAgentPreferredStyle("old-age"), null);
  assert.equal(imageAgentGuideAssets("old-age").before, "/agents/old-age-before.jpg");
  assert.equal(imageAgentGuideAssets("old-age").after, "/agents/old-age-after.jpg");
});

test("studio ignores a prefetch agent that is not in the address bar", () => {
  assert.equal(liveImageStudioQuery("remove-objects", "", null, "?agent=add-makeup"), null);
  assert.deepEqual(liveImageStudioQuery("add-makeup", "", null, "?agent=add-makeup"), { agent: "add-makeup", template: "", tab: null });
  assert.equal(imageStudioQueryKey("add-makeup", "", null), "add-makeup||");
});
