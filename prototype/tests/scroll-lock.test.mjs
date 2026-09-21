import test from "node:test";
import assert from "node:assert/strict";
import { acquireScrollLock, resetScrollLocks } from "../src/lib/scroll-lock.ts";

function installDocument() {
  const document = {
    documentElement: { style: { overflow: "auto" } },
    body: { style: { overflow: "visible" } },
  };
  globalThis.document = document;
  return document;
}

test("keeps scrolling locked until the last dialog releases it", () => {
  const document = installDocument();
  const releaseFirst = acquireScrollLock();
  const releaseSecond = acquireScrollLock();

  assert.equal(document.documentElement.style.overflow, "hidden");
  assert.equal(document.body.style.overflow, "hidden");

  releaseFirst();
  assert.equal(document.documentElement.style.overflow, "hidden");
  assert.equal(document.body.style.overflow, "hidden");

  releaseSecond();
  assert.equal(document.documentElement.style.overflow, "auto");
  assert.equal(document.body.style.overflow, "visible");
  delete globalThis.document;
});

test("route reset restores styles and makes late cleanup harmless", () => {
  const document = installDocument();
  const release = acquireScrollLock();

  resetScrollLocks();
  assert.equal(document.documentElement.style.overflow, "auto");
  assert.equal(document.body.style.overflow, "visible");

  release();
  assert.equal(document.documentElement.style.overflow, "auto");
  assert.equal(document.body.style.overflow, "visible");
  delete globalThis.document;
});
