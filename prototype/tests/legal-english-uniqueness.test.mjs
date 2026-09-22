import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const legalRoot = join(root, "content/legal/en");
const legalFiles = [
  "acceptable-use.md",
  "account-deletion.md",
  "cookies.md",
  "dpa.md",
  "intellectual-property.md",
  "privacy.md",
  "refund-policy.md",
  "security.md",
  "subprocessors.md",
  "terms.md",
];
const documentMarkers = {
  "acceptable-use.md": "The safety line",
  "account-deletion.md": "Scope of this procedure",
  "cookies.md": "What this notice covers",
  "dpa.md": "How this schedule attaches to the service",
  "intellectual-property.md": "The four ownership questions",
  "privacy.md": "The short version",
  "refund-policy.md": "What a Balance payment buys",
  "security.md": "What this statement describes",
  "subprocessors.md": "Why this list exists",
  "terms.md": "The contract you are accepting",
};
const documentVersions = {
  "cookies.md": "3.1",
};

test("English Genora legal set has independent wording and no legacy operator references", async () => {
  for (const file of legalFiles) {
    const content = await readFile(join(legalRoot, file), "utf8");
    assert.match(content, new RegExp(`^\\*\\*Version:\\*\\*\\s*${documentVersions[file] ?? "3.0"}`, "m"), file);
    assert.match(content, /Genora/i, file);
    assert.match(content, new RegExp(documentMarkers[file]), file);
    assert.doesNotMatch(content, /ModelStation|ELVARON LIMITED|Hong Kong|NAZARII SEMENYNA|\bDirector\s*:/i, file);
  }
});

test("English cookie policy documents the actual consent-controlled Google measurement", async () => {
  const content = await readFile(join(legalRoot, "cookies.md"), "utf8");
  assert.match(content, /G-D07763XPWC/);
  for (const signal of ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(content, new RegExp(signal));
  }
  assert.match(content, /denied/i);
});

test("English privacy policy states the European data-protection safeguards", async () => {
  const content = await readFile(join(legalRoot, "privacy.md"), "utf8");
  assert.match(content, /Articles? 13(?:–|-| to)14/i);
  assert.match(content, /Articles? 15(?:–|-| to)22/i);
  assert.match(content, /Article 27/i);
  assert.match(content, /Helsinki, Finland/);
  assert.match(content, /Netherlands/);
});
