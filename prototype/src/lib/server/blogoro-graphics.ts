const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const BLOGORO_HOSTED = /api\.blogoro\.pro\/competitor-images|\/competitor-images\//i;

export type ArticleGraphic = {
  url: string;
  alt: string;
  caption?: string | null;
  placement?: string | null;
};

function figureMarkdown(url: string, alt: string): string {
  return `![${alt.replace(/[[\]]/g, "")}](${url})`;
}

function normalizeImageLabel(value: string): string {
  return value.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function headingMatchScore(title: string, placement: string): number {
  if (!placement || !title) return 0;
  if (title === placement) return 300 + title.length;
  if (placement.includes(title) || title.includes(placement)) return 100 + title.length;
  return 0;
}

function graphicLabels(graphic: ArticleGraphic): string[] {
  return [graphic.alt, graphic.caption]
    .map((value) => normalizeImageLabel(value ?? ""))
    .filter(Boolean);
}

function isTitleGraphic(graphic: ArticleGraphic, articleTitle?: string): boolean {
  const title = normalizeImageLabel(articleTitle ?? "");
  if (!title) return false;
  const placement = normalizeImageLabel(graphic.placement ?? "");
  return graphicLabels(graphic).includes(title) && (!placement || placement === title);
}

function replaceMatchingImages(markdown: string, labels: string[], block: string): { text: string; replaced: boolean } {
  let replaced = false;
  const text = markdown.replace(MARKDOWN_IMAGE, (full, alt: string) => {
    if (!labels.includes(normalizeImageLabel(alt))) return full;
    if (!replaced) {
      replaced = true;
      return block;
    }
    return "";
  });
  return { text, replaced };
}

function insertAfterHeading(markdown: string, placement: string, block: string): string {
  if (!placement) return markdown;
  const headingRe = /^(#{2,3})\s+(.+?)\s*$/gm;
  let insertAt: { index: number; length: number; score: number } | null = null;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(markdown)) !== null) {
    const score = headingMatchScore(normalizeImageLabel(match[2]), placement);
    if (score && (!insertAt || score > insertAt.score)) {
      insertAt = { index: match.index, length: match[0].length, score };
    }
  }
  if (!insertAt) return markdown;
  const afterHeading = insertAt.index + insertAt.length;
  const tail = markdown.slice(afterHeading);
  if (/^\s*!\[[^\]]*\]\([^)]+\)/.test(tail)) return markdown;
  return `${markdown.slice(0, afterHeading)}\n\n${block}\n${tail}`;
}

function stripItalicCaptions(markdown: string, labels: Set<string>): string {
  return markdown
    .split("\n")
    .filter((line) => {
      const italic = /^[*_](.+?)[*_]$/.exec(line.trim());
      return !(italic && labels.has(normalizeImageLabel(italic[1])));
    })
    .join("\n");
}

function stripHostedLeftovers(markdown: string, articleTitle?: string): string {
  const title = normalizeImageLabel(articleTitle ?? "");
  return markdown.replace(MARKDOWN_IMAGE, (full, alt: string, url: string) => {
    if (BLOGORO_HOSTED.test(url)) return "";
    if (title && normalizeImageLabel(alt) === title) return "";
    return full;
  });
}

function collapseBlankLines(markdown: string): string {
  return `${markdown
    .replace(/\r\n?/g, "\n")
    .replace(/(!\[[^\]]*\]\([^)]+\))\n(?!\n)/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

/**
 * Одна живая картинка на слот: чужой адрес Blogoro заменяется своим,
 * повтор и хвост в конце статьи выбрасываются.
 */
export function placeArticleGraphics(
  markdown: string,
  graphics: ArticleGraphic[],
  articleTitle?: string,
): string {
  const labels = new Set(graphics.flatMap(graphicLabels));
  let result = markdown;
  const usedUrls = new Set<string>();

  for (const graphic of graphics) {
    if (!graphic.url || usedUrls.has(graphic.url) || isTitleGraphic(graphic, articleTitle)) continue;
    const keys = graphicLabels(graphic);
    if (!keys.length) continue;
    const block = figureMarkdown(graphic.url, graphic.alt || graphic.caption || "Иллюстрация");
    const replaced = replaceMatchingImages(result, keys, block);
    result = replaced.replaced
      ? replaced.text
      : insertAfterHeading(result, normalizeImageLabel(graphic.placement ?? ""), block);
    if (result.includes(graphic.url)) usedUrls.add(graphic.url);
  }

  result = stripItalicCaptions(result, labels);
  result = stripHostedLeftovers(result, articleTitle);
  return collapseBlankLines(result);
}
