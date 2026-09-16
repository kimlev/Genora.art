import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canCreateAiCharacter, canCreateCharacter, CHARACTER_LIMIT, CHARACTER_NAME_MAX, CHARACTER_NAME_MIN, CHARACTER_SOURCE_COUNT, validCharacterName } from "../src/lib/characters.ts";
import { imageAgentMinReferences } from "../src/lib/image-agent-models.ts";
import { characterUiCopy } from "../src/lib/i18n/copy/characters.ts";
import { videoCharacterRightsRequired, videoModelSupportsCharacter } from "../src/lib/catalog/video-studio.ts";
const locales = ["ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"];

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("character creation grants one free build and requires three source photos", () => {
  assert.equal(CHARACTER_LIMIT, 1);
  assert.equal(CHARACTER_SOURCE_COUNT, 3);
  assert.equal(CHARACTER_NAME_MIN, 3);
  assert.equal(CHARACTER_NAME_MAX, 25);
  assert.equal(validCharacterName("A"), false);
  assert.equal(validCharacterName("Ab"), false);
  assert.equal(validCharacterName("Anna"), true);
  assert.equal(validCharacterName("A".repeat(25)), true);
  assert.equal(validCharacterName("A".repeat(26)), false);
  assert.equal(canCreateCharacter("Anna", ["front", "profile", "full"], false), false);
  assert.equal(canCreateCharacter("Anna", ["front", "profile", "full"], true), true);
  assert.equal(canCreateCharacter("Anna", ["front", null, "full"], true), false);
  assert.equal(canCreateAiCharacter("Anna", "adult woman, red hair"), true);
  assert.equal(canCreateAiCharacter("Anna", "short"), false);
  assert.equal(imageAgentMinReferences("character-card"), 3);
});

test("ready character cards expose gallery actions and archive their generated sheet", async () => {
  const profile = await read("src/components/profile/profile-characters.tsx");
  const server = await read("src/lib/server/characters.ts");
  const route = await read("src/app/api/characters/[id]/route.ts");
  const migration = await read("db/migrations/066_character_archive_and_request_order.sql");
  assert.match(profile, /<Input required[^>]+minLength=\{CHARACTER_NAME_MIN\}[^>]+maxLength=\{CHARACTER_NAME_MAX\}/);
  assert.match(profile, /aria-required="true"/);
  for (const action of ["DownloadSizeAction", "Share2", "ThumbsUp", "Heart", "Trash2", "ImagePlus", "Clapperboard"]) assert.match(profile, new RegExp(action));
  assert.match(profile, /character\.modelLabel[^\n]+character\.format/);
  assert.match(profile, /character\.size/);
  assert.match(route, /archiveUserCharacter/);
  assert.match(server, /UPDATE characters[\s\S]+deleted_at=now\(\)/);
  assert.match(server, /UPDATE image_generations[\s\S]+asset_ids && \$2::text\[\]/);
  assert.match(migration, /CHECK \(char_length\(trim\(name\)\) BETWEEN 3 AND 25\) NOT VALID/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS deleted_at timestamptz/);
});

test("character agent normalizes identity first and then builds a 3x3 card", async () => {
  const agents = await read("src/lib/server/image-agents.ts");
  const prompts = await read("src/lib/image-agent-result-prompts.ts");
  const profile = await read("src/components/profile/profile-characters.tsx");
  assert.match(agents, /id:"character-card"[^\n]+inputMin:3,inputMax:3,consentRequired:false/);
  assert.match(prompts, /STAGE 1 — NORMALIZE THE CHARACTER INTERNALLY/);
  assert.match(prompts, /Photo 3 as the authority for body proportions AND the complete outfit/);
  assert.match(prompts, /STAGE 2 — BUILD THE CARD/);
  assert.match(prompts, /3-by-3 contact sheet/);
  assert.match(profile, /character-card-before\.jpg/);
  assert.match(profile, /character-card-profile\.jpg/);
  assert.match(profile, /character-card-full-body\.jpg/);
});

test("first profile character is free and later characters reserve their calculated price", async () => {
  const jobs = await read("src/lib/server/image-jobs.ts");
  const creator = await read("src/lib/server/characters.ts");
  assert.match(creator, /complimentary = !free\.rowCount/);
  assert.match(creator, /reservationTokens: complimentary \? undefined : quoteImage/);
  assert.match(jobs, /input\.complimentary \? 0/);
  assert.match(jobs, /input\.complimentary\s*\?\s*true/);
  assert.match(jobs, /!input\.complimentary/);
  assert.match(creator, /agentName: personal \? "Карточка персонажа" : "Карточка AI персонажа"/);
  const migration = await read("db/migrations/065_paid_characters.sql");
  assert.match(migration, /DROP INDEX IF EXISTS characters_one_active_per_user_idx/);
  assert.match(migration, /characters_one_complimentary_per_user_idx/);
});

test("characters are protected profile assets and appear in profile navigation", async () => {
  const migration = await read("db/migrations/064_characters.sql");
  const assets = await read("src/app/api/images/assets/[id]/route.ts");
  const sidebar = await read("src/components/layout/profile-sidebar.tsx");
  const workspace = await read("src/components/profile/profile-workspace.tsx");
  assert.match(migration, /characters_one_active_per_user_idx/);
  assert.match(assets, /source_asset_ids/);
  assert.match(sidebar, /profile\/characters/);
  assert.match(workspace, /ProfileCharacters/);
});

test("character consent is mandatory and saved characters can be used in photo and video", async () => {
  const profile = await read("src/components/profile/profile-characters.tsx");
  const api = await read("src/app/api/characters/route.ts");
  const studio = await read("src/components/images/image-studio.tsx");
  const imageApi = await read("src/app/api/images/generations/route.ts");
  const videoApi = await read("src/app/api/video/generations/route.ts");
  const picker = await read("src/components/characters/character-selector.tsx");
  assert.match(profile, /disabled=\{busy \|\| !createReady \|\| \(!complimentary && priceTokens == null\)\}/);
  assert.match(studio, /selectedAgent\?\.consentRequired/);
  assert.match(api, /body\?\.consent !== true/);
  assert.match(api, /consentConfirmed: body\?\.consent === true/);
  assert.match(await read("src/lib/server/characters.ts"), /if \(personal && !input\.consentConfirmed\) throw new Error\("CONSENT_REQUIRED"\)/);
  assert.match(studio, /characterId: usedCharacterId \|\| undefined/);
  assert.match(imageApi, /characterReferenceDataUrls\(user\.id, characterId\)/);
  assert.match(videoApi, /characterReferenceDataUrls\(user\.id, characterId\)/);
  assert.match(videoApi, /videoModelSupportsCharacter\(catalogModel\)/);
  assert.match(picker, /profile\/characters\?create=1/);
  assert.match(picker, /readyCharacters\.map/);
  assert.match(profile, /URLSearchParams\(window\.location\.search\)/);
});

test("studios show one generated character sheet inside the selected reference slot", async () => {
  const server = await read("src/lib/server/characters.ts");
  const studio = await read("src/components/images/image-studio.tsx");
  assert.match(server, /sheet_asset_ids\.slice\(0, 1\)/);
  assert.doesNotMatch(server, /\.\.\.sourceIds/);
  assert.match(studio, /selectedPhotoCharacterSlot/);
  assert.match(studio, /characterSlot: usedCharacterSlot/);
  assert.match(studio, /className="object-contain"/);
  assert.doesNotMatch(studio, /<CharacterSelector/);
});

test("character UI has usable copy in every supported locale", () => {
  for (const locale of locales) {
    const copy = characterUiCopy(locale);
    for (const key of ["nav", "title", "subtitle", "create", "consent", "build", "genericError", "personalMode", "aiMode", "aiDescriptionPlaceholder"]) {
      assert.ok(copy[key], `${locale}.${key}`);
    }
    assert.match(copy.consent.toLowerCase(), locale === "ru" ? /письменное согласие/ : /.+/);
  }
});

test("AI character uses a description, no personal photos, and the same recommended model", async () => {
  const profile = await read("src/components/profile/profile-characters.tsx");
  const server = await read("src/lib/server/characters.ts");
  const agents = await read("src/lib/server/image-agents.ts");
  const prompts = await read("src/lib/image-agent-result-prompts.ts");
  const migration = await read("db/migrations/067_ai_characters.sql");
  assert.match(profile, /\["personal", "ai"\]/);
  assert.match(profile, /kind === "personal" \? photos : \[\]/);
  assert.match(server, /personal \? CHARACTER_AGENT_ID : AI_CHARACTER_AGENT_ID/);
  assert.match(server, /const selected = characterModel\(catalog\.models\)/);
  assert.match(agents, /id:"ai-character-card"[^\n]+mode:"T2I",inputMin:0,inputMax:0/);
  assert.match(prompts, /Create ONE original fictional adult character/);
  assert.match(prompts, /ALL THREE tiles in the bottom row are true head-to-toe full-body views/);
  assert.match(migration, /kind text NOT NULL DEFAULT 'personal'/);
});

test("every reference-to-video model can receive one generated character sheet", () => {
  const base = { max_reference_images: 1, modes: ["ref-to-video"] };
  assert.equal(videoModelSupportsCharacter(base), true);
  assert.equal(videoModelSupportsCharacter({ ...base, person_in_video: false }), true);
  assert.equal(videoModelSupportsCharacter({ ...base, modes: ["image-to-video"] }), false);
  assert.equal(videoModelSupportsCharacter({ ...base, max_reference_images: 0 }), false);
});

test("only an explicit required rights policy blocks a personal character", () => {
  assert.equal(videoCharacterRightsRequired({ verified_asset: "required" }), true);
  assert.equal(videoCharacterRightsRequired({ verified_asset: "conditional" }), false);
  assert.equal(videoCharacterRightsRequired({ person_policy: { verified_asset: "not_documented" } }), false);
});
