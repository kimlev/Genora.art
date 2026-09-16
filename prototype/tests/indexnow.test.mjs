import assert from "node:assert/strict";
import test from "node:test";

import { indexNowPayload, isIndexNowKey, ownSiteUrls } from "../src/lib/indexnow.ts";

test("keeps only our own pages and drops repeats", () => {
  assert.deepEqual(
    ownSiteUrls([
      "https://genora.art/ru/blog/kak-vybrat-model",
      "/en/pricing",
      "https://genora.art/ru/blog/kak-vybrat-model",
      "https://example.com/ru/blog/kak-vybrat-model",
      "не адрес",
    ]),
    [
      "https://genora.art/ru/blog/kak-vybrat-model",
      "https://genora.art/en/pricing",
    ],
  );
});

test("drops the anchor: search engines index the page, not its part", () => {
  assert.deepEqual(ownSiteUrls(["https://genora.art/ru/pricing#plans"]), ["https://genora.art/ru/pricing"]);
});

test("accepts only keys the receiver allows", () => {
  assert.equal(isIndexNowKey("a11d3c68d4c7fd33"), true);
  assert.equal(isIndexNowKey("key-with-dashes-2026"), true);
  assert.equal(isIndexNowKey("short"), false);
  assert.equal(isIndexNowKey("ключ-по-русски"), false);
  assert.equal(isIndexNowKey(undefined), false);
});

test("the packet carries the host and the key location on the same host", () => {
  const payload = indexNowPayload("a11d3c68d4c7fd33", ["/ru/blog/hello"]);
  assert.equal(payload.host, "genora.art");
  assert.equal(payload.keyLocation, "https://genora.art/indexnow-key.txt");
  assert.deepEqual(payload.urlList, ["https://genora.art/ru/blog/hello"]);
});
