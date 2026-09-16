import assert from "node:assert/strict";
import test from "node:test";
import { cleanAudioMime, voiceFilename } from "@/lib/voice-recorder";

test("strips codecs from browser microphone mime", () => {
  assert.equal(cleanAudioMime("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(cleanAudioMime("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(cleanAudioMime("audio/webm"), "audio/webm");
});

test("uses a stable voice filename for IntegratorAI", () => {
  assert.equal(voiceFilename("audio/webm;codecs=opus"), "voice.webm");
  assert.equal(voiceFilename("audio/mp4"), "voice.m4a");
  assert.equal(voiceFilename("audio/ogg;codecs=opus"), "voice.ogg");
});
