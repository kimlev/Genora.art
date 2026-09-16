import { mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../public/agents/", import.meta.url));

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return nested.flat();
}

const scratch = await mkdtemp(join(tmpdir(), "genora-agent-assets-"));
let before = 0;
let after = 0;
let changed = 0;

try {
  const files = (await filesIn(root)).filter((path) => /\.jpe?g$/i.test(extname(path)) && !/-thumb\.jpe?g$/i.test(path));
  for (const path of files) {
    const sourceSize = (await stat(path)).size;
    const output = join(scratch, `${changed}-${basename(path)}`);
    await sharp(path).rotate().jpeg({ quality: 82, mozjpeg: true }).toFile(output);
    const outputSize = (await stat(output)).size;
    before += sourceSize;
    if (outputSize < sourceSize) {
      await rename(output, path);
      after += outputSize;
      changed += 1;
    } else {
      after += sourceSize;
      await rm(output, { force: true });
    }
  }
  console.log(JSON.stringify({ files: changed, beforeBytes: before, afterBytes: after, savedBytes: before - after }));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
