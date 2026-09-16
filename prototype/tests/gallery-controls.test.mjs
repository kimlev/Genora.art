import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("media title and eye share a single compact centered line", async () => {
  const source = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const card = source.slice(source.indexOf("function ResultCard("), source.indexOf("function retryAssetUrl("));
  assert.match(card, /flex h-4 items-center gap-2/);
  assert.match(card, /truncate text-xs font-medium leading-4/);
  assert.match(card, /after:-inset-1.5/);
});

test("song favorites header toggle composes with every existing filter", async () => {
  const source = await readFile(new URL("../src/components/music/music-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-pressed=\{favoritesOnly\}/);
  assert.match(source, /if \(favoritesOnly && !favorites.includes\(track.id\)\) return false/);
  assert.doesNotMatch(source, /typeFilter === "favorites"/);
  for (const field of ["typeFilter", "genreFilter", "styleFilter", "purposeFilter"]) {
    assert.ok(source.includes(`if (${field} !== "all"`));
  }
});

test("failed photo and video cards persist with a localized red error and zero spend", async () => {
  const studio = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const usage = await readFile(new URL("../src/components/profile/profile-usage.tsx", import.meta.url), "utf8");
  assert.match(studio, /generationErrorLabel/);
  assert.match(studio, /generationFailureLabel/);
  assert.match(studio, /errorCode: job\.errorCode/);
  assert.match(studio, /value instanceof GenerationJobError \? value\.errorCode : null/);
  assert.match(studio, /font-semibold text-destructive/);
  assert.match(studio, /status: "failed", billedTokens: 0/);
  assert.match(studio, /function PendingCard\([^\n]+onShowPrompt/);
  assert.match(studio, /mediaTitleCopy\(locale\)\.prompt/);
  assert.match(studio, /method: "DELETE"/);
  assert.match(usage, /row\.failed \? "text-destructive"/);
});

test("video provider can reset the dependent configuration and polling stays authoritative", async () => {
  const studio = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const videoJobs = await readFile(new URL("../src/lib/server/video-jobs.ts", import.meta.url), "utf8");
  assert.match(studio, /const resetVideoConfiguration = \(\) =>/);
  assert.match(studio, /onClear=\{provider \? resetVideoConfiguration : undefined\}/);
  assert.match(studio, /onClear && value && "relative pe-16"/);
  assert.match(studio, /\(center \|\| \(onClear && value\)\) && "absolute end-3"/);
  assert.match(studio, /className="absolute end-9 top-1\/2/);
  assert.match(studio, /error instanceof VideoPollingTimeout/);
  assert.match(studio, /pollingVideoJobsRef\.current\.has\(job\.id\)/);
  assert.match(videoJobs, /outcome\?\.status === "in_progress"/);
});

test("homepage video card opens the supplied playable video without a fullscreen caption", async () => {
  const hero = await readFile(new URL("../src/components/landing/hero-showcase.tsx", import.meta.url), "utf8");
  assert.match(hero, /const showcaseVideo = "\/landing\/genora-showcase\.mp4"/);
  assert.match(hero, /<video autoPlay controls playsInline preload="auto" poster=\{showcasePoster\}/);
  assert.doesNotMatch(hero, />\{copy\.openFullscreen\}<\/span>/);
  assert.doesNotMatch(hero, /\{copy\.fullscreenComing\}/);
});

test("failed, creating and ready gallery cards share one request-time chronology", async () => {
  const studio = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const imageJobs = await readFile(new URL("../src/lib/server/image-jobs.ts", import.meta.url), "utf8");
  const videoJobs = await readFile(new URL("../src/lib/server/video-jobs.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../db/migrations/066_character_archive_and_request_order.sql", import.meta.url), "utf8");
  assert.match(studio, /type PendingImageJob = \{[^\n]+createdAt: string/);
  assert.match(studio, /const libraryCards = \[\.\.\.pendingCards, \.\.\.readyCards\]\.sort\(\(left, right\) => new Date\(right\.createdAt\)/);
  assert.doesNotMatch(studio, /const libraryCards = \[\.\.\.pendingCards, \.\.\.readyCards\];/);
  assert.match(imageJobs, /createdAt: current\.rows\[0\]\.created_at\.toISOString\(\)/);
  assert.match(videoJobs, /INSERT INTO video_generations\([^\n]+created_at\)/);
  assert.match(migration, /job\.created_at < generation\.created_at/g);
});

test("every failed request is recorded with zero usage and highlighted in admin usage", async () => {
  const jobs = await readFile(new URL("../src/lib/server/generation-jobs.ts", import.meta.url), "utf8");
  const adminData = await readFile(new URL("../src/lib/server/admin-dashboard-data.ts", import.meta.url), "utf8");
  const adminUi = await readFile(new URL("../src/components/admin/admin-dashboard.tsx", import.meta.url), "utf8");
  assert.match(jobs, /`\$\{row\.kind\}-failed-\$\{jobId\}`/);
  assert.match(jobs, /0,0,0,0,0,\$9,0,0/);
  assert.match(adminData, /failed:row\.internal_only/);
  assert.match(adminUi, /item\.failed&&item\.billedTokens===0&&item\.costUsd===0/);
  assert.match(adminUi, /text-red-400/);
});

test("photo, video and song deletion requires a centered localized confirmation", async () => {
  const copy = await readFile(new URL("../src/lib/i18n/copy/delete-confirmation.ts", import.meta.url), "utf8");
  const images = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const music = await readFile(new URL("../src/components/music/music-studio.tsx", import.meta.url), "utf8");
  const dialog = await readFile(new URL("../src/components/layout/confirm-action-dialog.tsx", import.meta.url), "utf8");

  assert.match(copy, /ru: \{ title: "Удалить\?", cancel: "Отмена", confirm: "Подтвердить" \}/);
  assert.match(copy, /satisfies Record<Locale, DeleteConfirmationCopy>/);
  assert.match(dialog, /fixed inset-0[^"\n]*grid place-items-center/);

  for (const source of [images, music]) {
    assert.match(source, /title=\{deleteCopy\.title\}/);
    assert.match(source, /cancelLabel=\{deleteCopy\.cancel\}/);
    assert.match(source, /confirmLabel=\{deleteCopy\.confirm\}/);
    assert.match(source, /onClose=\{\(\) => setPendingDelete\(null\)\}/);
    assert.match(source, /onConfirm=\{\(\) => \{/);
  }
  assert.match(images, /onDismiss=\{\(\) => setPendingJobDelete\(card\.job\)\}/);
  assert.match(images, /pendingJobDelete \? \(/);
  assert.match(images, /void dismissPendingJob\(job\)/);
});

test("applying user usage filters reloads current history and refreshes the page", async () => {
  const usage = await readFile(new URL("../src/components/profile/profile-usage.tsx", import.meta.url), "utf8");
  const history = await readFile(new URL("../src/lib/usage-history.ts", import.meta.url), "utf8");
  assert.match(usage, /await refreshUsageHistory\(user\.email\)/);
  assert.match(usage, /router\.refresh\(\)/);
  assert.match(history, /fetch\("\/api\/usage", \{ cache: "no-store" \}\)/);
});

test("photo and video sharing sends the media file plus its direct URL", async () => {
  const studio = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  const gallery = await readFile(new URL("../src/components/gallery/gallery-page-content.tsx", import.meta.url), "utf8");
  for (const source of [studio, gallery]) {
    assert.match(source, /const shareData = \{ url: absoluteUrl, files: \[file\] \}/);
    assert.match(source, /navigator\.share\(shareData\)/);
    assert.match(source, /navigator\.share\(\{ files: \[file\] \}\)/);
    assert.match(source, /navigator\.share\(\{ url: absoluteUrl \}\)/);
  }
});

test("general gallery shares deletion, favorites and the editable prompt dialog with internal galleries", async () => {
  const gallery = await readFile(new URL("../src/components/gallery/gallery-page-content.tsx", import.meta.url), "utf8");
  assert.match(gallery, /galleryWorkIsFavorite\(work, favorites\)/);
  assert.match(gallery, /<Trash2 className="size-3"/);
  assert.match(gallery, /<ConfirmActionDialog/);
  assert.match(gallery, /<MediaPromptDialog/);
  assert.match(gallery, /renameMedia\(promptWork\.kind as "photo" \| "video", promptWork\.rateId!, title\)/);
  assert.match(gallery, /title: image\.title \|\| generation\.prompt \|\| conversation\.title/g);
  assert.match(gallery, /const caption = work\.kind === "photo" \|\| work\.kind === "video" \? \(work\.mediaTitle \|\| work\.prompt \|\| work\.title\)/);
});

test("models page shows the live filtered count beside every category heading", async () => {
  const catalog = await readFile(new URL("../src/components/catalog/models-catalog-page.tsx", import.meta.url), "utf8");
  assert.match(catalog, /\{title\} \(\{models\.length\.toLocaleString\(locale\)\}\)/);
});
