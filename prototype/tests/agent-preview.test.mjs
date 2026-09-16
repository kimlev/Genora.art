import assert from "node:assert/strict";
import test from "node:test";

import { AGENT_NAME_MAX } from "../src/lib/agent-context.ts";
import {
  agentPreviewKind,
  cardComparePreviewAssets,
  cardStillPreviewSrc,
  compareCornerLabels,
  comparePreviewAssets,
  isCompareAgentPreview,
  MY_AGENT_COVER,
  stillPreviewSrc,
} from "../src/lib/agent-preview.ts";
import { IMAGE_AGENT_EXPANSION_IDS } from "../src/lib/image-agent-expansions.ts";

test("background agents use a before and after slider", () => {
  assert.equal(agentPreviewKind("background-removal"), "compare");
  assert.equal(agentPreviewKind("background-replace"), "compare");
  assert.equal(agentPreviewKind("gta-filter"), "compare");
  assert.equal(isCompareAgentPreview("background-removal"), true);
  assert.equal(comparePreviewAssets("background-removal").after, "/agents/preview-cutout.jpg");
  assert.equal(comparePreviewAssets("background-replace").after, "/agents/preview-after.jpg");
  assert.deepEqual(comparePreviewAssets("gta-filter"), {
    before: "/agents/gta-filter-before.jpg",
    after: "/agents/gta-filter-after.jpg",
  });
  assert.deepEqual(cardComparePreviewAssets("gta-filter"), {
    before: "/agents/thumbs/gta-filter-before.webp",
    after: "/agents/thumbs/gta-filter-after.webp",
  });
  assert.deepEqual(compareCornerLabels("ru"), { before: "До", after: "После" });
});

test("catalog agents keep their own still or compare covers", () => {
  assert.equal(agentPreviewKind("honest-ai"), "photo");
  assert.equal(stillPreviewSrc("honest-ai"), "/agents/honest-ai.jpg");
  assert.equal(isCompareAgentPreview("honest-ai"), false);
  assert.equal(agentPreviewKind("logo-generator"), "photo");
  assert.equal(stillPreviewSrc("logo-generator"), "/agents/logo-generator.jpg");
  assert.equal(comparePreviewAssets("pro-headshot").after, "/agents/pro-headshot-after.jpg");
  assert.equal(comparePreviewAssets("privacy-redaction").before, "/agents/privacy-redaction-before.jpg");
  assert.equal(comparePreviewAssets("restore-old-photo").after, "/agents/restore-old-photo-after.jpg");
  assert.equal(agentPreviewKind("character-card"), "compare");
  assert.equal(comparePreviewAssets("character-card").after, "/agents/character-card-after.jpg");
  assert.equal(agentPreviewKind("kare"), "compare");
  assert.equal(comparePreviewAssets("kare").before, "/agents/kare-before.jpg");
  assert.equal(comparePreviewAssets("remove-beard").after, "/agents/remove-beard-after.jpg");
  assert.equal(agentPreviewKind("rain"), "compare");
  assert.equal(comparePreviewAssets("rain").before, "/agents/rain-before.jpg");
  assert.equal(comparePreviewAssets("business-suit-man").after, "/agents/business-suit-man-after.jpg");
  assert.equal(comparePreviewAssets("santorini").after, "/agents/santorini-after.jpg");
  assert.equal(comparePreviewAssets("face-swap").before, "/agents/face-swap-2.jpg");
  assert.equal(agentPreviewKind("cartoon-hero"), "compare");
  assert.equal(comparePreviewAssets("cartoon-hero").before, "/agents/cartoon-hero-before.jpg");
  assert.equal(comparePreviewAssets("fantasy").after, "/agents/fantasy-after.jpg");
  assert.equal(agentPreviewKind("old-age"), "compare");
  assert.equal(comparePreviewAssets("pixel-illustration").before, "/agents/pixel-illustration-before.jpg");
  assert.equal(comparePreviewAssets("x-ray").after, "/agents/x-ray-after.jpg");
  assert.equal(cardComparePreviewAssets("old-age").after, "/agents/thumbs/old-age-after.webp");
  assert.equal(comparePreviewAssets("comic-2").before, "/agents/comic-2-before.jpg");
  assert.equal(comparePreviewAssets("fashion-caricature").after, "/agents/fashion-caricature-after.jpg");
});

test("video prompt agent shows a still cover", () => {
  assert.equal(agentPreviewKind("video-promt"), "photo");
  assert.equal(stillPreviewSrc("video-promt"), "/agents/video-promt.jpg");
  assert.equal(cardStillPreviewSrc("video-promt"), "/agents/thumbs/video-promt.webp");
  assert.equal(isCompareAgentPreview("video-promt"), false);
});

test("photo prompt agent shows a still frame, not a slider", () => {
  assert.equal(agentPreviewKind("photo-to-prompt"), "photo");
  assert.equal(stillPreviewSrc("photo-to-prompt"), "/agents/photo-to-prompt.jpg");
  assert.equal(cardStillPreviewSrc("photo-to-prompt"), "/agents/thumbs/photo-to-prompt.webp");
  assert.equal(isCompareAgentPreview("photo-to-prompt"), false);
});

test("cards use compact webp thumbs, studio keeps full jpgs", () => {
  assert.equal(cardComparePreviewAssets("santorini").after, "/agents/thumbs/santorini-after.webp");
  assert.equal(cardComparePreviewAssets("astronaut").before, "/agents/thumbs/astronaut-before.webp");
  assert.equal(cardStillPreviewSrc("decision-compare"), "/agents/thumbs/decision-compare.webp");
  assert.equal(comparePreviewAssets("santorini").after, "/agents/santorini-after.jpg");
});

test("new pose and scene agents use before-and-after previews", () => {
  for (const id of IMAGE_AGENT_EXPANSION_IDS) {
    assert.equal(agentPreviewKind(id), "compare", id);
    assert.deepEqual(comparePreviewAssets(id), {
      before: `/agents/${id}-before.jpg`,
      after: `/agents/${id}-after.jpg`,
    }, id);
    assert.deepEqual(cardComparePreviewAssets(id), {
      before: `/agents/thumbs/${id}-before.webp`,
      after: `/agents/thumbs/${id}-after.webp`,
    }, id);
  }
});

test("custom agents share one cover image", () => {
  assert.equal(MY_AGENT_COVER, "/agents/my-agent.png");
});

test("agent title stays on one card line", () => {
  assert.equal(AGENT_NAME_MAX, 32);
  assert.ok("Скрытие персональных данных".length <= AGENT_NAME_MAX);
});
