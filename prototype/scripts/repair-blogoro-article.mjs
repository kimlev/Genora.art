import { readFileSync, writeFileSync } from "node:fs";
import { markdownToHtml } from "../src/lib/blog/markdown-html.ts";
import { placeArticleGraphics } from "../src/lib/server/blogoro-graphics.ts";

const title = "Русскоязычные ИИ-сервисы: как пользоваться бесплатно";
const origin = process.env.ARTICLE_ORIGIN || "https://genora.art";
const markdown = readFileSync(process.argv[2], "utf8");
const media = JSON.parse(readFileSync(process.argv[3], "utf8"));
const graphics = media
  .filter((item) => item.kind === "graphic")
  .map((item) => ({
    url: `${origin}/blogoro/media/${item.id}`,
    alt: item.alt,
    caption: item.alt,
    placement: item.alt,
  }));

const next = placeArticleGraphics(markdown, graphics, title);
writeFileSync(process.argv[4], next);
writeFileSync(process.argv[5], markdownToHtml(next));
console.log(JSON.stringify({
  images: [...next.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]),
  leftoverBlogoro: /api\.blogoro\.pro/.test(next),
  titleAlts: (next.match(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
}));
