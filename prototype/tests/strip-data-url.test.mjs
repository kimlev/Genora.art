import assert from "node:assert/strict";
import test from "node:test";
import { stripDataUrlBase64 } from "@/lib/chat-attachments";

test("strips browser microphone data URL with codecs", () => {
  const raw = Buffer.alloc(64, 7).toString("base64");
  const wrapped = `data:audio/webm;codecs=opus;base64,${raw}`;
  assert.equal(stripDataUrlBase64(wrapped), raw);
  assert.notEqual(wrapped.replace(/^data:[^;]+;base64,/, ""), raw);
});

test("keeps a plain data URL without extra parameters", () => {
  assert.equal(stripDataUrlBase64("data:audio/wav;base64,AAAA"), "AAAA");
});
