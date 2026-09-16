import assert from "node:assert/strict";
import test from "node:test";
import { parseSingleByteRange } from "../src/lib/server/byte-range.ts";

test("returns no range when the header is absent", () => {
  assert.equal(parseSingleByteRange(null, 100), undefined);
});

test("parses bounded, open-ended and suffix byte ranges", () => {
  assert.deepEqual(parseSingleByteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(parseSingleByteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseSingleByteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(parseSingleByteRange("bytes=90-200", 100), { start: 90, end: 99 });
});

test("rejects invalid and unsatisfiable ranges", () => {
  assert.equal(parseSingleByteRange("bytes=100-", 100), null);
  assert.equal(parseSingleByteRange("bytes=20-10", 100), null);
  assert.equal(parseSingleByteRange("bytes=0-1,4-5", 100), null);
  assert.equal(parseSingleByteRange("bytes=-0", 100), null);
});
