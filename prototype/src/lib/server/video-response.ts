import { parseSingleByteRange } from "@/lib/server/byte-range";

// Keep both the first response and subsequent reads bounded, including bytes=0-.
const CHUNK_BYTES = 512 * 1024;

export function videoResponse(
  request: Request,
  asset: { mime: string; size: number },
  read: (start: number, length: number) => Promise<Uint8Array>,
) {
  const range = parseSingleByteRange(request.headers.get("range"), asset.size);
  const headers: Record<string, string> = {
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=31536000, immutable",
    "content-type": asset.mime,
    "x-content-type-options": "nosniff",
  };
  if (range === null) return new Response(null, {
    status: 416, headers: { ...headers, "content-range": `bytes */${asset.size}` },
  });
  const start = range?.start ?? 0;
  const end = range?.end ?? asset.size - 1;
  headers["content-length"] = String(end - start + 1);
  if (range) headers["content-range"] = `bytes ${start}-${end}/${asset.size}`;
  let offset = start;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled || request.signal.aborted) { controller.close(); return; }
      const length = Math.min(CHUNK_BYTES, end - offset + 1);
      try {
        const bytes = await read(offset, length);
        if (cancelled) return;
        if (bytes.byteLength !== length) throw new Error("VIDEO_READ_INCOMPLETE");
        controller.enqueue(bytes);
        offset += length;
        if (offset > end) controller.close();
      } catch (error) {
        if (!cancelled) controller.error(error);
      }
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  return new Response(stream, { status: range ? 206 : 200, headers });
}
