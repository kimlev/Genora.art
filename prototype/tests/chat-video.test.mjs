import assert from "node:assert/strict";
import test from "node:test";

import {
  chatModelAcceptsVideo,
  geminiVideoMime,
  isGeminiVideoFile,
  MAX_CHAT_VIDEO_BYTES,
} from "../src/lib/chat-video.ts";

test("Gemini chat accepts video only for Google Gemini", () => {
  assert.equal(chatModelAcceptsVideo("Google", "gemini-3.6-flash"), true);
  assert.equal(chatModelAcceptsVideo("google", "auto"), true);
  assert.equal(chatModelAcceptsVideo("OpenAI", "gpt-5-4"), false);
  assert.equal(chatModelAcceptsVideo("Google", "gemma-3-27b"), false);
});

test("only Gemini video formats and 100 MB are allowed", () => {
  assert.equal(isGeminiVideoFile("clip.mp4", "video/mp4"), true);
  assert.equal(isGeminiVideoFile("clip.mov", "video/quicktime"), true);
  assert.equal(isGeminiVideoFile("clip.webm", ""), true);
  assert.equal(isGeminiVideoFile("photo.jpg", "image/jpeg"), false);
  assert.equal(geminiVideoMime("walk.mov", ""), "video/quicktime");
  assert.equal(MAX_CHAT_VIDEO_BYTES, 100 * 1024 * 1024);
});
