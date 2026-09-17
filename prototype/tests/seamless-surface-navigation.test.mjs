import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const surfaces = await readFile(new URL("../src/components/layout/authenticated-app-surfaces.tsx", import.meta.url), "utf8");
const loaders = await readFile(new URL("../src/components/layout/authenticated-surface-loader.ts", import.meta.url), "utf8");
const sidebar = await readFile(new URL("../src/components/layout/workspace-sidebar.tsx", import.meta.url), "utf8");
const localeRouter = await readFile(new URL("../src/lib/i18n/use-locale-push.ts", import.meta.url), "utf8");

test("heavy authenticated studios are warmed after the persistent shell mounts", () => {
  assert.match(surfaces, /dynamic\(\(\) => import\("@\/components\/images\/image-studio"\)/);
  assert.match(surfaces, /dynamic\(\(\) => import\("@\/components\/music\/music-studio"\)/);
  assert.match(surfaces, /preloadAuthenticatedSurface\("images"\)/);
  assert.match(surfaces, /preloadAuthenticatedSurface\("music"\)/);
  assert.match(loaders, /export function preloadAuthenticatedSurface/);
  assert.match(loaders, /images: \(\) => import\("@\/components\/images\/image-studio"\)/);
  assert.match(loaders, /music: \(\) => import\("@\/components\/music\/music-studio"\)/);
});

test("sidebar prepares studio chunks without eagerly prefetching persistent authenticated routes", () => {
  assert.match(localeRouter, /export function useLocalePrefetch/);
  assert.match(localeRouter, /router\.prefetch\(localizeHref\(href, locale\)\)/);
  assert.match(sidebar, /const prepareSurface = \(href: SurfaceHref\)/);
  assert.match(sidebar, /if \(!user \|\| !isPersistentSurfaceHref\(href\)\) prefetchLocale\(href\)/);
  assert.match(sidebar, /preloadableSurfaceForHref\(href\)/);
  assert.match(sidebar, /onPointerEnter=\{\(\) => prepareSurface\("\/video-examples"\)\}/);
  assert.match(sidebar, /if \(preloadableSurface\) void preloadAuthenticatedSurface\(preloadableSurface\)/);
  assert.doesNotMatch(sidebar, /AUTHENTICATED_PREFETCH_PATHS/);
  assert.doesNotMatch(sidebar, /\.then\(navigate, navigate\)/);
});

test("already visited authenticated surfaces remain mounted", () => {
  assert.match(surfaces, /visited\.has\("images"\) \|\| active === "images"/);
  assert.match(surfaces, /visited\.has\("music"\) \|\| active === "music"/);
});
