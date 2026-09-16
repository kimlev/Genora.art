import assert from "node:assert/strict";
import test from "node:test";

import { decodedBase64Size, MAX_TRANSCRIPTION_AUDIO_BYTES, validateTranscriptionAudio } from "../src/lib/transcription-policy.ts";

test("transcription accepts supported audio and rejects malformed or unsupported input", () => {
  assert.equal(validateTranscriptionAudio("YWJj", "audio/webm"), null);
  assert.equal(validateTranscriptionAudio("", "audio/webm"), "empty_audio");
  assert.equal(validateTranscriptionAudio("%%%", "audio/webm"), "audio_too_large");
  assert.equal(validateTranscriptionAudio("YWJj", "text/plain"), "unsupported_audio");
});

test("transcription enforces the decoded ten megabyte boundary", () => {
  assert.equal(decodedBase64Size("YQ=="), 1);
  const tooLarge = "A".repeat(Math.ceil((MAX_TRANSCRIPTION_AUDIO_BYTES + 1) * 4 / 3));
  assert.equal(validateTranscriptionAudio(tooLarge, "audio/mp4"), "audio_too_large");
});
