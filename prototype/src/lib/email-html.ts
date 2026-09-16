const ALLOWED_TAGS = new Set([
  "A", "P", "BR", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI",
  "H1", "H2", "H3", "H4", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "IMG", "HR",
  "BLOCKQUOTE", "PRE", "CODE",
]);

const VOID_TAGS = new Set(["BR", "IMG", "HR"]);

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const point = Number.parseInt(code, 16);
      return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : "";
    })
    .replace(/&amp;/gi, "&");
}

function maybeDecodeQuotedPrintable(value: string): string {
  const markers = value.match(/=[0-9A-F]{2}/gi)?.length ?? 0;
  if (!/=\r?\n/.test(value) && markers < 3) return value;
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function recoverEncodedHtml(value: string): string {
  if (looksLikeHtml(value)) return value;
  if (/&lt;\s*\/?\s*(?:html|body|table|div|p|br|img|a|span|h[1-4]|strong|ul|ol|li)\b/i.test(value)) {
    return decodeHtmlEntities(value);
  }
  return value;
}

function stripBrokenImgTails(value: string): string {
  return value
    .replace(/(https?:\/\/[^\s<>"']+)"\s*alt="[^"]*"\s*(?:width="\d+"\s*)?(?:height="\d+"\s*)?\/?>/gi, "$1")
    .replace(/\s+(?:width|height)="1"\s+(?:width|height)="1"\s*\/?>/gi, "");
}

function isTrackingSrc(src: string): boolean {
  return /(?:fluentcrm=1[\s\S]*route=open|\/wf\/open\?|[?&]open=1|\/track(?:ing)?\/|pixel\.gif|open\.gif|1x1\.(?:gif|png))/i.test(src);
}

function stripTrackingUrls(value: string): string {
  return value
    .replace(/https?:\/\/[^\s<>"'`]*?(?:fluentcrm=1[\s\S]{0,200}?route=open|\/wf\/open\?|[?&]open=1|\/track(?:ing)?\/|pixel\.gif|open\.gif)[^\s<>"'`]*/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTrailingPunctuation(url: string): { href: string; trail: string } {
  const href = url.replace(/[),.;:!?]+$/u, "");
  return { href, trail: url.slice(href.length) };
}

function linkifyText(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"'`]+/gi, (url) => {
    const { href, trail } = splitTrailingPunctuation(url);
    if (!/^https?:\/\//i.test(href) || isTrackingSrc(href)) return trail;
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeAttr(href)}</a>${trail}`;
  });
}

export function linkifyBareUrls(html: string): string {
  return html.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi).map((chunk, index) => {
    if (index % 2 === 1) return chunk;
    return chunk.split(/(<[^>]+>)/g).map((piece) => (piece.startsWith("<") ? piece : linkifyText(piece))).join("");
  }).join("");
}

function sanitizeAttrs(tag: string, raw: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const name = match[1].toLowerCase();
    const value = decodeHtmlEntities((match[2] ?? match[3] ?? match[4] ?? "").trim());
    if (name.startsWith("on") || name === "srcdoc") continue;
    if ((name === "href" || name === "src") && !/^(https?:|mailto:|data:image\/)/i.test(value)) continue;
    if (!["href", "src", "alt", "title", "colspan", "rowspan", "width", "height"].includes(name)) continue;
    if (name === "src" && tag === "IMG" && isTrackingSrc(value)) continue;
    out.push(` ${name}="${escapeAttr(value)}"`);
  }
  if (tag === "A" && out.some((item) => item.startsWith(" href="))) {
    out.push(' target="_blank" rel="noreferrer"');
  }
  if (tag === "IMG") {
    const width = Number(/ width="(\d+)"/.exec(out.join(""))?.[1] ?? 99);
    const height = Number(/ height="(\d+)"/.exec(out.join(""))?.[1] ?? 99);
    if (width <= 1 && height <= 1) return "";
    if (!out.some((item) => item.startsWith(" src="))) return "";
    out.push(' loading="lazy"');
  }
  return out.join("");
}

function rewriteTags(html: string): string {
  return html.replace(/<\/?([a-zA-Z][\w-]*)\b([^>]*)\/?>/g, (full, rawName: string, rawAttrs: string) => {
    const name = rawName.toUpperCase();
    const closing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return VOID_TAGS.has(name) ? "" : `</${name.toLowerCase()}>`;
    const attrs = sanitizeAttrs(name, rawAttrs);
    if (name === "IMG" && !attrs) return "";
    return `<${name.toLowerCase()}${attrs}${VOID_TAGS.has(name) ? " />" : ">"}`;
  });
}

export function formatStoredEmail(text: string): string {
  const cleaned = stripTrackingUrls(stripBrokenImgTails(decodeHtmlEntities(
    maybeDecodeQuotedPrintable(text.replace(/\r/g, "")),
  )));
  if (!cleaned) return "";
  const escaped = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const emphasized = escaped.replace(
    /\*([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9 ._-]{0,40})\*/g,
    "<strong>$1</strong>",
  );
  const named = emphasized.replace(
    /([A-Za-zА-Яа-я0-9][^()<>\n]{0,50}?)\s*\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return linkifyBareUrls(named).replace(/\n/g, "<br/>");
}

export function sanitizeEmailHtml(html: string): string {
  const prepared = maybeDecodeQuotedPrintable(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base)[^>]*\/?>/gi, "");
  return linkifyBareUrls(rewriteTags(prepared));
}

export function renderEmailHtml(content: string): string {
  const recovered = recoverEncodedHtml(content);
  return looksLikeHtml(recovered) ? sanitizeEmailHtml(recovered) : formatStoredEmail(recovered);
}
