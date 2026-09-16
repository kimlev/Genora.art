import assert from "node:assert/strict";
import test from "node:test";
import { galleryWorkFavoriteId, galleryWorkIsFavorite, normalizeGalleryFavoriteIds } from "../src/lib/gallery-work-favorites.ts";

test("general and internal galleries use the same media asset id for favorites", () => {
  const work = { id: "request-id-asset-id", rateId: "asset-id" };
  assert.equal(galleryWorkFavoriteId(work), "asset-id");
  assert.equal(galleryWorkIsFavorite(work, ["asset-id"]), true);
  assert.deepEqual(normalizeGalleryFavoriteIds(["request-id-asset-id"], [work]), ["asset-id"]);
});
