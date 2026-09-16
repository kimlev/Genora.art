export type SeoArticleBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export type SeoArticleFaq = { question: string; answer: string };

export type SeoArticleId = "models" | "agents" | "images" | "videos" | "pricing" | "rating";

export type SeoArticle = {
  id: SeoArticleId;
  title: string;
  lead: string;
  sections: Array<{ heading: string; blocks: SeoArticleBlock[] }>;
  faqTitle: string;
  faq: SeoArticleFaq[];
};
