import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const SUPPORTED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type OptimizedImage = {
  bytes: Buffer;
  mime: "image/webp";
};

export type OptimizedVideo = {
  bytes: Buffer;
  mime: "video/mp4";
};

function canOptimize(mime: string): boolean {
  return SUPPORTED_IMAGE_MIMES.has(mime.toLowerCase());
}

const execFileAsync = promisify(execFile);
let sharpLoader: Promise<(typeof import("sharp"))["default"] | null> | null = null;

function getSharp() {
  sharpLoader ??= import("sharp").then(({ default: sharp }) => sharp).catch(() => null);
  return sharpLoader;
}

async function resizeWithVipsCli(bytes: Buffer, width: number, quality: number): Promise<Buffer | null> {
  const directory = await mkdtemp(join(tmpdir(), "genora-image-"));
  const inputPath = join(directory, "input");
  const outputPath = join(directory, "output.webp");
  try {
    await writeFile(inputPath, bytes);
    await execFileAsync(
      "vipsthumbnail",
      [
        inputPath,
        "--size",
        `${width}x${width}`,
        "--path",
        `${outputPath}[Q=${quality},strip]`,
        "--vips-concurrency=2",
        "--vips-cache-max-memory=67108864",
        "--vips-max-coord=9000",
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    const output = await readFile(outputPath);
    return output.length ? output : null;
  } catch {
    return null;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function resizeWebp(bytes: Buffer, width: number, quality: number): Promise<OptimizedImage | null> {
  if (!bytes.length) return null;
  try {
    const sharp = await getSharp();
    const output = sharp
      ? await sharp(bytes, { failOn: "none", limitInputPixels: 80_000_000, pages: 1 })
          .rotate()
          .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
          .webp({ quality, effort: 4, smartSubsample: true })
          .toBuffer()
      : await resizeWithVipsCli(bytes, width, quality);
    if (!output) return null;
    return output.length ? { bytes: output, mime: "image/webp" } : null;
  } catch {
    return null;
  }
}

export async function createGalleryPreview(bytes: Buffer, mime: string): Promise<OptimizedImage | null> {
  if (!canOptimize(mime)) return null;
  return resizeWebp(bytes, 640, 78);
}

export async function optimizeAgentCover(bytes: Buffer, mime: string): Promise<OptimizedImage | null> {
  if (!canOptimize(mime)) return null;
  return resizeWebp(bytes, 1280, 82);
}

export async function createVideoPreview(bytes: Buffer): Promise<OptimizedImage | null> {
  if (!bytes.length) return null;
  const directory = await mkdtemp(join(tmpdir(), "genora-video-"));
  const inputPath = join(directory, "input-video");
  const outputPath = join(directory, "preview.webp");
  try {
    await writeFile(inputPath, bytes);
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-ss",
        "0",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:640:force_original_aspect_ratio=decrease",
        "-c:v",
        "libwebp",
        "-quality",
        "75",
        "-compression_level",
        "4",
        "-threads",
        "2",
        "-map_metadata",
        "-1",
        "-y",
        outputPath,
      ],
      { timeout: 45_000, maxBuffer: 1024 * 1024 },
    );
    const output = await readFile(outputPath);
    return output.length ? { bytes: output, mime: "image/webp" } : null;
  } catch {
    return null;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function createAgentVideoLoopPreview(bytes: Buffer): Promise<OptimizedVideo | null> {
  if (!bytes.length) return null;
  const directory = await mkdtemp(join(tmpdir(), "genora-agent-video-"));
  const inputPath = join(directory, "input-video");
  const outputPath = join(directory, "preview.mp4");
  try {
    await writeFile(inputPath, bytes);
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner", "-loglevel", "error", "-nostdin",
        "-i", inputPath,
        "-t", "12",
        "-vf", "scale=360:640:force_original_aspect_ratio=decrease,fps=12",
        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "34",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-map_metadata", "-1",
        "-y", outputPath,
      ],
      { timeout: 90_000, maxBuffer: 1024 * 1024 },
    );
    const output = await readFile(outputPath);
    return output.length ? { bytes: output, mime: "video/mp4" } : null;
  } catch {
    return null;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
