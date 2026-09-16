import assert from "node:assert/strict";
import test from "node:test";

import { getAgentById } from "../src/lib/mock/agents.ts";
import {
  isPhotoPromptAgent,
  PHOTO_PROMPT_HIDDEN_INSTRUCTION,
  PHOTO_PROMPT_MODEL_INSTRUCTION,
  photoPromptDisplayContent,
  photoPromptHint,
  photoPromptPlaceholder,
  photoPromptRequestContent,
} from "../src/lib/photo-prompt-agent.ts";

test("FotoPromt keeps the chat phrase off the model", () => {
  assert.equal(isPhotoPromptAgent("photo-to-prompt"), true);
  assert.equal(isPhotoPromptAgent("video-promt"), false);
  assert.equal(photoPromptHint("ru"), PHOTO_PROMPT_HIDDEN_INSTRUCTION);
  assert.equal(photoPromptHint("en"), "compose a prompt for this photo");
  assert.equal(photoPromptPlaceholder("ru"), "Просто добавьте фото");
  assert.equal(photoPromptPlaceholder("en"), "Just add a photo");
  assert.equal(photoPromptDisplayContent("", "ru"), PHOTO_PROMPT_HIDDEN_INSTRUCTION);
  assert.equal(photoPromptDisplayContent("  короче  ", "ru"), `${PHOTO_PROMPT_HIDDEN_INSTRUCTION}\n\nкороче`);
  assert.equal(photoPromptDisplayContent(PHOTO_PROMPT_HIDDEN_INSTRUCTION, "ru"), PHOTO_PROMPT_HIDDEN_INSTRUCTION);
  assert.equal(photoPromptDisplayContent("", "en"), photoPromptHint("en"));
  assert.equal(photoPromptRequestContent(""), PHOTO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(photoPromptRequestContent("  короче  "), PHOTO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(photoPromptRequestContent(`${PHOTO_PROMPT_HIDDEN_INSTRUCTION}\n\nкороче`), PHOTO_PROMPT_MODEL_INSTRUCTION);
  assert.match(PHOTO_PROMPT_MODEL_INSTRUCTION, /HOW TO READ THE FRAME/);
  assert.equal(getAgentById("photo-to-prompt")?.systemPrompt, PHOTO_PROMPT_MODEL_INSTRUCTION);
});
