import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const particulars = [
  "Sangerto LTD",
  "17456264",
  "71-75, Shelton Street, Covent Garden, London, WC2H 9JQ, UNITED KINGDOM",
];

test("all published legal documents identify the new operator", async () => {
  for (const folder of ["content/legal", "content/legal/en"]) {
    const files = (await readdir(join(root, folder))).filter((file) => file.endsWith(".md"));
    assert.ok(files.length > 0);
    for (const file of files) {
      const content = await readFile(join(root, folder, file), "utf8");
      for (const value of particulars) assert.ok(content.includes(value), `${folder}/${file} lacks ${value}`);
      assert.doesNotMatch(content, /NAZARII SEMENYNA|\bDirector\s*:|\bДиректор\s*:/i);
      assert.doesNotMatch(content, /ELVARON LIMITED|79402144|China Building/);
    }
  }
});

test("footer and localized copyright contain the new company", async () => {
  const footer = await readFile(join(root, "src/components/layout/site-footer.tsx"), "utf8");
  for (const value of particulars) assert.ok(footer.includes(value));
  assert.doesNotMatch(footer, /NAZARII SEMENYNA|\bDirector\s*:|\bДиректор\s*:/i);
  const locales = join(root, "src/lib/i18n/locales");
  for (const file of (await readdir(locales)).filter((name) => name.endsWith(".ts"))) {
    const content = await readFile(join(locales, file), "utf8");
    assert.match(content, /copyrightFull: "© Genora\.art — Sangerto LTD\./, file);
    assert.doesNotMatch(content, /ELVARON LIMITED/);
  }
});

test("legal policies describe UK law and European primary storage without Hong Kong clauses", async () => {
  for (const folder of ["content/legal", "content/legal/en"]) {
    const files = (await readdir(join(root, folder))).filter((file) => file.endsWith(".md"));
    for (const file of files) {
      const content = await readFile(join(root, folder, file), "utf8");
      assert.doesNotMatch(content, /Hong Kong|Гонконг|HKIAC|PDPO|PCPD|Companies Ordinance|Inland Revenue Ordinance/, `${folder}/${file}`);
    }
    const terms = await readFile(join(root, folder, "terms.md"), "utf8");
    const privacy = await readFile(join(root, folder, "privacy.md"), "utf8");
    assert.match(terms, /England and Wales|Англии и Уэльса/);
    assert.match(privacy, /Helsinki, Finland|Хельсинки, Финляндия/);
    assert.match(privacy, /Netherlands|Нидерландах/);
    assert.match(privacy, /6 years|6 лет/);
  }
});
