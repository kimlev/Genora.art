import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/components/layout/workspace-sidebar.tsx", import.meta.url), "utf8");

test("sidebar lamp is static and only shown for unread completed results", () => {
  const lamp = source.match(/function SurfaceLamp[\s\S]*?\n}/)?.[0];
  assert.ok(lamp);
  assert.match(lamp, /if \(!unread\) return null/);
  assert.doesNotMatch(lamp, /busy|animate-/);
  assert.doesNotMatch(source, /sectionBusy|busySurfaces|generatingIds|marker === "busy"|busy=\{/);
  assert.match(source, /marker=\{unreadIds\.includes\(conversation\.id\) \? "unread" : "idle"\}/);
  assert.match(source, /sectionUnread \? <SurfaceLamp unread \/> : <Plus/);
});

test("authorized parent sections toggle without opening a new workspace", () => {
  assert.match(source, /const AUTH_TOGGLE_ONLY = new Set<Surface>\(\["chat", "images", "battle"\]\)/);
  assert.match(source, /if \(user && AUTH_TOGGLE_ONLY\.has\(item\)\) \{\s*toggleExpanded\(\);\s*return;/);
  assert.doesNotMatch(source, /AUTH_TOGGLE_ONLY[^\n]*"audio"/);
  assert.match(source, /if \(user && item === "agents"\) \{[\s\S]*?if \(active === "agents"\) toggleExpanded\(\);[\s\S]*?openSurface\("\/agents"\)/);
});
