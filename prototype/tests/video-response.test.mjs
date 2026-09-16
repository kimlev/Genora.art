import assert from "node:assert/strict";
import test from "node:test";
import { videoResponse } from "../src/lib/server/video-response.ts";

const original = Uint8Array.from({ length: 1_600_123 }, (_, i) => i % 251);
for (const [header, status, start, end] of [
  [null, 200, 0, original.length - 1],
  ["bytes=0-", 206, 0, original.length - 1],
  ["bytes=100-900", 206, 100, 900],
  ["bytes=-100", 206, original.length - 100, original.length - 1],
  ["bytes=1600000-9999999", 206, 1600000, original.length - 1],
]) {
  test(`video streams exact bytes and bounded reads: ${header}`, async () => {
    const reads = [];
    const request = new Request("https://example.test/video", { headers: header ? { range: header } : {} });
    const response = videoResponse(request, { mime: "video/mp4", size: original.length }, async (offset, length) => {
      reads.push([offset, length]);
      return original.slice(offset, offset + length);
    });
    assert.equal(reads.length, 0, "no full file fetch before sending headers");
    assert.equal(response.status, status);
    assert.equal(response.headers.get("content-length"), String(end - start + 1));
    if (header) assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${original.length}`);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original.slice(start, end + 1));
    assert.ok(reads.every(([, size]) => size <= 512 * 1024));
  });
}

test("invalid range never reads a file", () => {
  const response = videoResponse(new Request("https://example.test", { headers: { range: "bytes=9999999-" } }),
    { mime: "video/mp4", size: original.length }, async () => { assert.fail("must not read"); });
  assert.equal(response.status, 416);
  assert.equal(response.headers.get("content-range"), `bytes */${original.length}`);
});

test("closing player stops further reads", async () => {
  let reads = 0;
  const response = videoResponse(new Request("https://example.test"), { mime: "video/mp4", size: original.length }, async (start, length) => {
    reads++;
    return original.slice(start, start + length);
  });
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads, 1);
});

test("truncated storage fails instead of returning a corrupt successful stream", async () => {
  const response = videoResponse(new Request("https://example.test"), { mime: "video/mp4", size: 10 }, async () => new Uint8Array(2));
  await assert.rejects(response.arrayBuffer(), /VIDEO_READ_INCOMPLETE/);
});
