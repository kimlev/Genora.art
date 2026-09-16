#!/usr/bin/env node
import { writeFile, mkdir, access, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examples = JSON.parse(await readFile(join(root, "src/lib/catalog/image-examples-data.json"), "utf8"));
const outDir = join(root, "public/image-examples");

const baseUrl = process.env.INTEGRATOR_BASE_URL?.trim().replace(/\/$/, "");
const apiKey = process.env.INTEGRATOR_API_KEY?.trim();
if (!baseUrl || !apiKey) {
  console.error("Need INTEGRATOR_BASE_URL and INTEGRATOR_API_KEY");
  process.exit(1);
}

const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((value) => value !== "--force");

function exists(path) {
  return access(path).then(() => true).catch(() => false);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function saveImage(url, rawPath) {
  const absolute = url.startsWith("http") || url.startsWith("data:") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  if (absolute.startsWith("data:")) {
    await writeFile(rawPath, Buffer.from(absolute.split(",")[1] || "", "base64"));
    return;
  }
  const response = await fetch(absolute, { headers: { authorization: `Bearer ${apiKey}` } });
  if (!response.ok || !response.body) throw new Error(`download ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(rawPath));
}

async function generate(example) {
  const body = {
    provider: example.provider,
    model: example.modelId,
    prompt: example.prompt.ru,
    size: example.size,
    format: example.format,
    style: example.style,
    n: 1,
    source: "Genora.art · примеры изображений",
  };
  if (example.reasoning) body.reasoning = example.reasoning;
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12 * 60_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.[0]?.url) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  return payload.data[0];
}

await mkdir(outDir, { recursive: true });
const selected = only.length
  ? examples.filter((example) => only.includes(String(example.slot)) || only.includes(example.id))
  : examples;

const concurrency = Math.max(1, Number(process.env.IMAGE_EXAMPLE_CONCURRENCY || 3));
let ok = 0;
let skipped = 0;
let failed = 0;
let cursor = 0;

async function work(example) {
  const target = join(root, "public", example.image.replace(/^\//, ""));
  if (!force && await exists(target)) {
    console.log(`skip ${example.slot} ${example.id}`);
    skipped += 1;
    return;
  }
  const rawPath = join(outDir, `${example.id}.raw`);
  console.log(`gen ${example.slot} ${example.modelLabel} ${example.style}`);
  try {
    const image = await generate(example);
    await saveImage(image.url, rawPath);
    try {
      await run("sips", ["-s", "format", "jpeg", "-Z", "1600", rawPath, "--out", target]);
    } catch {
      await writeFile(target, await readFile(rawPath));
    }
    console.log(`ok ${example.slot}`);
    ok += 1;
  } catch (error) {
    console.log(`FAIL ${example.slot}`, error instanceof Error ? error.message : error);
    failed += 1;
  }
}

async function worker() {
  while (cursor < selected.length) {
    const example = selected[cursor];
    cursor += 1;
    await work(example);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()));

if (ok || selected.length) {
  try {
    await run("python3", [join(root, "scripts/optimize-image-examples.py")]);
  } catch (error) {
    console.log("thumb optimize skipped", error instanceof Error ? error.message : error);
  }
}

console.log(JSON.stringify({ ok, skipped, failed, total: selected.length }));
if (failed) process.exit(2);
