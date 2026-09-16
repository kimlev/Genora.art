const MAX_TEXT = 20_000;
const MAX_HTML = 800_000;
const MAX_IMAGE = 1_500_000;

function headerValue(headers: string, name: string): string {
  const match = headers.match(new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\r?\\n[\\w-]+:|$)`, "im"));
  return match?.[1]?.replace(/\r?\n[ \t]+/g, " ").trim() ?? "";
}

function normalizeCharset(value: string): string {
  const charset = value.trim().replace(/["']/g, "").toLowerCase();
  if (!charset || charset === "utf8" || charset === "us-ascii" || charset === "ascii") return "utf-8";
  if (charset === "iso-8859-1" || charset === "latin1") return "windows-1252";
  return charset;
}

function charsetFrom(contentType: string, html = ""): string {
  const fromType = contentType.match(/charset\s*=\s*["']?([^"'\s;]+)/i)?.[1];
  const fromMeta = html.match(/charset\s*=\s*["']?([^"'\s;"']+)/i)?.[1];
  return normalizeCharset(fromType || fromMeta || "utf-8");
}

function bytesToText(bytes: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes).replace(/\u0000/g, "").trim();
  } catch {
    return bytes.toString("utf8").replace(/\u0000/g, "").trim();
  }
}

function looksQuotedPrintable(body: string): boolean {
  return /=\r?\n/.test(body) || (body.match(/=[0-9A-F]{2}/gi)?.length ?? 0) >= 4;
}

function decodeTransfer(body: string, encoding: string): Buffer {
  const enc = encoding.toLowerCase();
  if (enc.includes("base64")) return Buffer.from(body.replace(/\s+/g, ""), "base64");
  if (enc.includes("quoted-printable") || (!enc && looksQuotedPrintable(body))) {
    const decoded = body.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
    return Buffer.from(decoded, "latin1");
  }
  return Buffer.from(body, "latin1");
}

function partName(headers: string, contentType: string): string {
  const disposition = headerValue(headers, "Content-Disposition");
  return (
    disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i)?.[1]
    ?? disposition.match(/filename="?([^";]+)"?/i)?.[1]
    ?? contentType.match(/name="?([^";]+)"?/i)?.[1]
    ?? ""
  ).trim().replace(/^<|>$/g, "");
}

function splitMimeParts(raw: string): Array<{ headers: string; body: string }> {
  const boundary = raw.match(/boundary="?([^"\s;]+)"?/i)?.[1];
  if (!boundary) {
    const index = raw.search(/\r?\n\r?\n/);
    return [{ headers: index >= 0 ? raw.slice(0, index) : "", body: index >= 0 ? raw.slice(index).replace(/^\r?\n\r?\n/, "") : raw }];
  }
  const token = `--${boundary}`;
  const parts: Array<{ headers: string; body: string }> = [];
  for (const chunk of raw.split(token).slice(1)) {
    if (chunk.startsWith("--")) continue;
    const index = chunk.search(/\r?\n\r?\n/);
    const headers = index >= 0 ? chunk.slice(0, index) : "";
    const body = index >= 0 ? chunk.slice(index).replace(/^\r?\n\r?\n/, "") : chunk;
    if (/multipart\//i.test(headerValue(headers, "Content-Type"))) {
      parts.push(...splitMimeParts(`Content-Type: ${headerValue(headers, "Content-Type")}\r\n\r\n${body}`));
    } else {
      parts.push({ headers, body });
    }
  }
  return parts;
}

function inlineImages(html: string, images: Map<string, string>): string {
  if (!images.size) return html;
  return html
    .replace(/cid:([^"'\s>]+)/gi, (_, id: string) => images.get(id.replace(/^<|>$/g, "").toLowerCase()) ?? `cid:${id}`)
    .replace(/\b(src|background)\s*=\s*(["'])(?!https?:|data:|cid:)([^"']+)\2/gi, (full, attr: string, quote: string, src: string) => {
      const key = src.split(/[\\/]/).pop()?.toLowerCase() ?? "";
      const found = images.get(src.toLowerCase()) ?? images.get(key);
      return found ? `${attr}=${quote}${found}${quote}` : full;
    });
}

function extractPlainTextFallback(raw: string): string {
  const plain = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\nContent-Type:|$)/i);
  const html = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
  const body = plain?.[1] ?? (html?.[1] ? html[1].replace(/<[^>]+>/g, " ") : raw.replace(/^[\s\S]*?\r?\n\r?\n/, ""));
  return body.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))).trim();
}

export function extractEmailBodies(source?: Buffer | string): { text: string; html: string } {
  if (!source) return { text: "", html: "" };
  const raw = typeof source === "string" ? source : source.toString("latin1");
  const parts = splitMimeParts(raw);
  let text = "";
  let html = "";
  const images = new Map<string, string>();
  for (const part of parts) {
    const type = headerValue(part.headers, "Content-Type").toLowerCase();
    const encoding = headerValue(part.headers, "Content-Transfer-Encoding");
    const cid = headerValue(part.headers, "Content-ID").replace(/^<|>$/g, "");
    const bytes = decodeTransfer(part.body, encoding);
    if (type.startsWith("image/") || /^image\//.test(type.split(";")[0] ?? "")) {
      if (bytes.length <= MAX_IMAGE) {
        const mime = (type.split(";")[0] || "image/png").trim();
        const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
        if (cid) images.set(cid.toLowerCase(), dataUri);
        const file = partName(part.headers, type);
        if (file) {
          try {
            images.set(decodeURIComponent(file).toLowerCase(), dataUri);
          } catch {
            images.set(file.toLowerCase(), dataUri);
          }
        }
      }
      continue;
    }
    if ((type.includes("text/plain") || type.startsWith("text/plain")) && !text) {
      text = bytesToText(bytes, charsetFrom(type));
    }
    if ((type.includes("text/html") || type.includes("application/xhtml")) && !html) {
      html = bytesToText(bytes, charsetFrom(type));
    }
  }
  if (!text && !html) text = extractPlainTextFallback(raw);
  if (html) html = inlineImages(html, images);
  if (!text && html) text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { text: text.slice(0, MAX_TEXT), html: html.slice(0, MAX_HTML) };
}
