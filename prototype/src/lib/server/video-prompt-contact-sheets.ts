import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { ChatAttachmentPayload } from "@/lib/chat-attachments";
import {
  VIDEO_PROMPT_CONTACT_SHEET_FPS,
  VIDEO_PROMPT_CONTACT_SHEET_FRAMES,
  VIDEO_PROMPT_MAX_CONTACT_SHEET_IMAGES,
  videoPromptContactSheetInstruction,
  videoPromptContactSheetPageSizes,
} from "@/lib/video-prompt-agent";

const execFileAsync = promisify(execFile);
const TILE_COLUMNS = 6;
const TILE_ROWS = 4;
const TILE_SIZE = 192;
const PACKED_PAGE_GAP = 12;
const PACKED_PAGE_MAX_SIDE = 4096;
const PACKED_PAGE_MAX_BYTES = 2_250_000;
const SHEET_PADDING = 2;
const SHEET_MARGIN = 4;
const SHEET_WIDTH = TILE_COLUMNS * TILE_SIZE + (TILE_COLUMNS - 1) * SHEET_PADDING + 2 * SHEET_MARGIN;
const SHEET_HEIGHT = TILE_ROWS * TILE_SIZE + (TILE_ROWS - 1) * SHEET_PADDING + 2 * SHEET_MARGIN;

function closestSquareGrid(count: number, sheetWidth: number, sheetHeight: number) {
  let best = { columns: 1, rows: count, score: Number.POSITIVE_INFINITY };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const ratio = (columns * sheetWidth) / (rows * sheetHeight);
    const score = Math.abs(Math.log(ratio));
    if (score < best.score) best = { columns, rows, score };
  }
  return best;
}

async function packContactSheetPage(sheets: ChatAttachmentPayload[], pageIndex: number, pageCount: number) {
  const directory = await mkdtemp(join(tmpdir(), "genora-contact-page-"));
  const inputPaths = sheets.map((_, index) => join(directory, `sheet-${index + 1}.jpg`));
  const outputPath = join(directory, "packed.jpg");
  try {
    await Promise.all(sheets.map((sheet, index) => writeFile(inputPaths[index], Buffer.from(sheet.dataBase64, "base64"))));
    const { columns } = closestSquareGrid(sheets.length, SHEET_WIDTH, SHEET_HEIGHT);
    const layout = sheets.map((_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return `${column * (SHEET_WIDTH + PACKED_PAGE_GAP)}_${row * (SHEET_HEIGHT + PACKED_PAGE_GAP)}`;
    }).join("|");
    for (const maxSide of [PACKED_PAGE_MAX_SIDE, 3584, 3072, 2560]) {
      for (const quality of [5, 8, 12]) {
        const scale = `scale=w='min(iw,${maxSide})':h='min(ih,${maxSide})':force_original_aspect_ratio=decrease`;
        const args = [
          "-hide_banner", "-loglevel", "error", "-nostdin",
          ...inputPaths.flatMap((path) => ["-i", path]),
          ...(sheets.length === 1
            ? ["-vf", scale]
            : ["-filter_complex", `xstack=inputs=${sheets.length}:layout=${layout}:fill=#e5e7eb,${scale}`]),
          "-frames:v", "1", "-q:v", String(quality), "-threads", "2", "-map_metadata", "-1", "-y", outputPath,
        ];
        await execFileAsync("ffmpeg", args, { timeout: 90_000, maxBuffer: 2 * 1024 * 1024 });
        const output = await readFile(outputPath);
        if (output.length <= PACKED_PAGE_MAX_BYTES) {
          return {
            name: `video-contact-sheets-${pageIndex + 1}-of-${pageCount}.jpg`,
            mime: "image/jpeg",
            kind: "image" as const,
            dataBase64: output.toString("base64"),
          };
        }
      }
    }
    throw new Error("VIDEO_CONTACT_SHEET_PAGE_TOO_LARGE");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function packContactSheets(sheets: ChatAttachmentPayload[]) {
  const pageSizes = videoPromptContactSheetPageSizes(sheets.length, VIDEO_PROMPT_MAX_CONTACT_SHEET_IMAGES);
  let offset = 0;
  return Promise.all(pageSizes.map((size, pageIndex) => {
    const page = sheets.slice(offset, offset + size);
    offset += size;
    return packContactSheetPage(page, pageIndex, pageSizes.length);
  }));
}

async function contactSheetsForVideo(video: ChatAttachmentPayload, videoIndex: number) {
  const directory = await mkdtemp(join(tmpdir(), "genora-video-prompt-"));
  const inputPath = join(directory, "input-video");
  const outputPattern = join(directory, "sheet-%04d.jpg");
  try {
    await writeFile(inputPath, Buffer.from(video.dataBase64, "base64"));
    const filter = [
      `fps=${VIDEO_PROMPT_CONTACT_SHEET_FPS}`,
      `scale=${TILE_SIZE}:${TILE_SIZE}:force_original_aspect_ratio=decrease`,
      `pad=${TILE_SIZE}:${TILE_SIZE}:(ow-iw)/2:(oh-ih)/2:color=black`,
      `tile=${TILE_COLUMNS}x${TILE_ROWS}:nb_frames=${VIDEO_PROMPT_CONTACT_SHEET_FRAMES}:padding=${SHEET_PADDING}:margin=${SHEET_MARGIN}`,
    ].join(",");
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin",
      "-i", inputPath,
      "-an", "-vf", filter,
      "-fps_mode", "vfr",
      "-q:v", "5", "-threads", "2", "-map_metadata", "-1",
      "-start_number", "1", "-y", outputPattern,
    ], { timeout: 180_000, maxBuffer: 2 * 1024 * 1024 });
    const names = (await readdir(directory))
      .filter((name) => /^sheet-\d+\.jpg$/.test(name))
      .sort();
    if (!names.length) throw new Error("VIDEO_CONTACT_SHEETS_EMPTY");
    return Promise.all(names.map(async (name, sheetIndex): Promise<ChatAttachmentPayload> => ({
      name: `video-${videoIndex + 1}-contact-sheet-${sheetIndex + 1}.jpg`,
      mime: "image/jpeg",
      kind: "image",
      dataBase64: (await readFile(join(directory, name))).toString("base64"),
    })));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function replaceVideosWithContactSheets(attachments: ChatAttachmentPayload[]) {
  const videos = attachments.filter((item) => item.kind === "video");
  if (!videos.length) return null;
  const sheetGroups = await Promise.all(videos.map(contactSheetsForVideo));
  const packedSheets = await packContactSheets(sheetGroups.flat());
  let inserted = false;
  const replaced = attachments.flatMap((item) => {
    if (item.kind !== "video") return [item];
    if (inserted) return [];
    inserted = true;
    return packedSheets;
  });
  return {
    attachments: replaced,
    instruction: videoPromptContactSheetInstruction(sheetGroups.map((items) => items.length), packedSheets.length),
    sheetCount: sheetGroups.reduce((total, items) => total + items.length, 0),
  };
}
