import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin exposes the complete staged YouTube workflow", async () => {
  const [dashboard, types, component] = await Promise.all([
    read("src/components/admin/admin-dashboard.tsx"),
    read("src/components/admin/admin-types.ts"),
    read("src/components/admin/admin-youtube.tsx"),
  ]);
  for (const section of ["youtube-connect", "youtube-research", "youtube-plan", "youtube-script", "youtube-package", "youtube-production", "youtube-publish", "youtube-analytics"]) {
    assert.match(dashboard, new RegExp(section));
    assert.match(types, new RegExp(section));
  }
  assert.match(component, /Подтвердить публикацию/);
  assert.match(component, /Завершить и перейти дальше/);
});

test("YouTube persistence separates settings, projects, runs and OAuth state", async () => {
  const migration = await read("db/migrations/071_youtube_workspace.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS youtube_settings/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS youtube_projects/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS youtube_stage_runs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS youtube_oauth_states/);
  assert.match(migration, /publish_approved_at/);
});

test("OAuth tokens are encrypted and publication stays approval-gated", async () => {
  const [oauth, workflow, route] = await Promise.all([
    read("src/lib/server/youtube-oauth.ts"),
    read("src/lib/server/youtube-workspace.ts"),
    read("src/app/api/admin/youtube/route.ts"),
  ]);
  assert.match(oauth, /aes-256-gcm/);
  assert.match(oauth, /YOUTUBE_TOKEN_ENCRYPTION_KEY/);
  assert.match(oauth, /uploadType=resumable/);
  assert.match(workflow, /YOUTUBE_PUBLISH_APPROVAL_REQUIRED/);
  assert.match(workflow, /YOUTUBE_STAGE_OUT_OF_ORDER/);
  assert.match(workflow, /metadata IS DISTINCT FROM \$9::jsonb/);
  assert.match(route, /youtube_publish_approve/);
  assert.doesNotMatch(oauth, /console\.log\([^)]*(clientSecret|access_token|refresh_token)/);
});

test("dev worker processes scheduled YouTube automation", async () => {
  const [compose, worker, internalRoute] = await Promise.all([
    read("../infra/genora-dev/compose.yml"),
    read("scripts/youtube-worker.mjs"),
    read("src/app/api/internal/youtube/process/route.ts"),
  ]);
  assert.match(compose, /youtube-worker:/);
  assert.match(worker, /api\/internal\/youtube\/process/);
  assert.match(internalRoute, /timingSafeEqual/);
  assert.match(internalRoute, /runDueYoutubeAutomations/);
});
