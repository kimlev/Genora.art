import type { SeoArticle, SeoArticleBlock, SeoArticleFaq, SeoArticleId } from "@/lib/content/seo-article-types";

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}/.test(line.replace(/\|/g, "").trim()) || /^[\s|:-]+$/.test(line);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseBlocks(lines: string[]): SeoArticleBlock[] {
  const blocks: SeoArticleBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trim();
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("#### ")) {
      blocks.push({ type: "h4", text: line.slice(5).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        const current = (lines[i] ?? "").trim();
        if (!isTableSeparator(current)) rows.push(splitTableRow(current));
        i += 1;
      }
      if (rows.length >= 2) {
        const [headers, ...body] = rows;
        blocks.push({ type: "table", headers, rows: body });
      }
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    const parts: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (!next || next.startsWith("#") || next.startsWith("|") || /^\d+\.\s+/.test(next) || /^[-*]\s+/.test(next)) break;
      parts.push(next);
      i += 1;
    }
    blocks.push({ type: "p", text: parts.join(" ") });
  }

  return blocks;
}

function isFaqHeading(heading: string): boolean {
  return heading.trim().toLowerCase() === "faq";
}

function stripQuestionMarks(text: string): string {
  return text.replace(/^\*\*|\*\*$/g, "").replace(/\?+$/, "").trim() + (text.includes("?") ? "?" : "");
}

function parseFaq(lines: string[]): { faq: SeoArticleFaq[]; leftover: string[] } {
  const faq: SeoArticleFaq[] = [];
  const leftover: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("### ") && !line.includes("?")) {
      leftover.push(...lines.slice(i));
      break;
    }
    const boldQuestion = line.match(/^\*\*(.+?)\*\*$/);
    const headingQuestion = line.startsWith("### ") ? line.slice(4).trim() : "";
    if (boldQuestion || headingQuestion) {
      const question = stripQuestionMarks(boldQuestion?.[1] ?? headingQuestion);
      i += 1;
      const answer: string[] = [];
      while (i < lines.length) {
        const next = (lines[i] ?? "").trim();
        if (!next) {
          if (answer.length) break;
          i += 1;
          continue;
        }
        if (next.startsWith("### ") || next.match(/^\*\*(.+?)\*\*$/) || next.startsWith("## ")) break;
        answer.push(next);
        i += 1;
      }
      if (question && answer.length) faq.push({ question, answer: answer.join(" ") });
      continue;
    }
    i += 1;
  }

  return { faq, leftover };
}

export function parseSeoMarkdown(source: string, id: SeoArticleId = "images"): SeoArticle {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  let title = "";

  while (index < lines.length && !lines[index]?.startsWith("# ")) index += 1;
  if (lines[index]?.startsWith("# ")) {
    title = lines[index].slice(2).trim();
    index += 1;
  }

  const pre: string[] = [];
  while (index < lines.length && !lines[index]?.startsWith("## ")) {
    pre.push(lines[index] ?? "");
    index += 1;
  }

  const preBlocks = parseBlocks(pre);
  const lead = preBlocks.find((block) => block.type === "p")?.text ?? "";
  const sections: SeoArticle["sections"] = [];
  const restPre = preBlocks.filter((block) => !(block.type === "p" && block.text === lead));
  if (restPre.length) sections.push({ heading: "Короткое содержание", blocks: restPre });

  const faq: SeoArticleFaq[] = [];
  let faqTitle = "Частые вопросы";
  let seenFaq = false;

  while (index < lines.length) {
    const heading = (lines[index] ?? "").replace(/^##\s+/, "").trim();
    index += 1;
    const body: string[] = [];
    while (index < lines.length && !lines[index]?.startsWith("## ")) {
      body.push(lines[index] ?? "");
      index += 1;
    }

    if (isFaqHeading(heading)) {
      if (seenFaq) continue;
      seenFaq = true;
      faqTitle = heading;
      const parsed = parseFaq(body);
      faq.push(...parsed.faq);
      if (parsed.leftover.length) {
        const leftoverBlocks = parseBlocks(parsed.leftover);
        const leftoverHeading = leftoverBlocks[0]?.type === "h3" ? leftoverBlocks[0].text : "Главное";
        const leftoverRest = leftoverBlocks[0]?.type === "h3" ? leftoverBlocks.slice(1) : leftoverBlocks;
        if (leftoverRest.length) sections.push({ heading: leftoverHeading, blocks: leftoverRest });
      }
      continue;
    }

    sections.push({ heading, blocks: parseBlocks(body) });
  }

  return { id, title, lead, sections, faqTitle, faq };
}
