import type { Locale } from "@/lib/i18n";

export type BlogSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  language: Locale;
  topic: string;
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
  content: string[];
  sections?: BlogSection[];
  translations?: {
    en?: Pick<BlogPost, "title" | "excerpt" | "topic">;
  };
  source?: "static" | "blogoro";
  h1?: string;
  canonicalUrl?: string;
  robots?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  faq?: Array<{ question: string; answer: string }>;
  internalLinks?: Array<{ anchor: string; url: string }>;
  openGraph?: { title: string; description: string; type: string };
  jsonLd?: unknown[];
  coverAlt?: string;
  pageLanguage?: string;
};

/** Показываются, только пока в базе нет ни одной статьи, поэтому помечены как `static` */
export const fallbackPosts: BlogPost[] = [
  {
    source: "static",
    slug: "kak-vybrat-model-dlya-zadachi",
    title: "Как выбрать нейросеть под конкретную задачу",
    excerpt: "Практический подход к выбору модели для текста, кода, анализа и поиска без бесконечных тестов.",
    image: "/blog/model-choice.svg",
    language: "ru",
    topic: "Модели",
    tags: ["выбор модели", "GPT", "Claude", "Gemini"],
    publishedAt: "2026-08-10",
    readingMinutes: 6,
    content: [
      "Универсально лучшей модели не существует: качество зависит от типа задачи, объёма контекста, требований к скорости и допустимой стоимости.",
      "Для коротких повседневных запросов чаще подходят быстрые модели. Сложный анализ, программирование и работа с большими документами требуют более сильного рассуждения и расширенного контекста.",
      "В Genora.art можно сохранить исходную задачу, запустить её на нескольких моделях и сравнить ответы без переноса текста между сервисами.",
    ],
    sections: [
      { id: "no-universal-model", title: "Почему нет одной лучшей модели", paragraphs: ["Универсально лучшей модели не существует: качество зависит от типа задачи, объёма контекста, требований к скорости и допустимой стоимости."] },
      { id: "speed-vs-depth", title: "Скорость или глубина ответа", paragraphs: ["Для коротких повседневных запросов чаще подходят быстрые модели. Сложный анализ, программирование и работа с большими документами требуют более сильного рассуждения и расширенного контекста."] },
      { id: "compare-in-one-chat", title: "Как сравнивать модели без лишней работы", paragraphs: ["В Genora.art можно сохранить исходную задачу, запустить её на нескольких моделях и сравнить ответы без переноса текста между сервисами."] },
    ],
    translations: {
      en: { title: "How to choose the right AI model for a specific task", excerpt: "A practical way to choose a model for writing, code, analysis, and research without endless testing.", topic: "Models" },
    },
  },
  {
    source: "static",
    slug: "pamyat-ai-bez-povtorov",
    title: "Память AI: как перестать повторять контекст",
    excerpt: "Разбираемся, чем долговременная память отличается от истории чата и когда она действительно экономит время.",
    image: "/blog/ai-memory.svg",
    language: "ru",
    topic: "Возможности",
    tags: ["память", "контекст", "продуктивность"],
    publishedAt: "2026-08-09",
    readingMinutes: 5,
    content: [
      "История сообщений хранит последовательность диалога, но сама по себе не определяет, какие сведения важны для будущей работы.",
      "Память Genora.art выделяет факты, находит связанные эпизоды и учитывает время событий. Благодаря этому новый разговор может продолжить предыдущую задачу.",
      "Пользователь получает меньше повторов, более последовательные ответы и возможность вести долгие проекты через разные модели и агентов.",
    ],
    sections: [
      { id: "history-vs-memory", title: "История чата и память — не одно и то же", paragraphs: ["История сообщений хранит последовательность диалога, но сама по себе не определяет, какие сведения важны для будущей работы."] },
      { id: "important-facts", title: "Как сохраняются важные факты", paragraphs: ["Память Genora.art выделяет факты, находит связанные эпизоды и учитывает время событий. Благодаря этому новый разговор может продолжить предыдущую задачу."] },
      { id: "practical-benefit", title: "Что получает пользователь", paragraphs: ["Пользователь получает меньше повторов, более последовательные ответы и возможность вести долгие проекты через разные модели и агентов."] },
    ],
    translations: {
      en: { title: "AI memory: stop repeating the same context", excerpt: "How long-term memory differs from chat history and when it really saves time.", topic: "Capabilities" },
    },
  },
  {
    source: "static",
    slug: "ai-agenty-dlya-raboty",
    title: "AI-агенты: от ответа к выполненной работе",
    excerpt: "Почему агент — это не просто промпт и как готовые роли помогают быстрее получать прикладной результат.",
    image: "/blog/ai-agents.svg",
    language: "ru",
    topic: "Агенты",
    tags: ["агенты", "автоматизация", "рабочие процессы"],
    publishedAt: "2026-08-08",
    readingMinutes: 7,
    content: [
      "Обычный чат отвечает на сообщение. Агент работает в рамках заранее заданной роли, использует подходящую модель и придерживается нужного формата результата.",
      "Готовые агенты Genora.art помогают проверять код, готовить тексты, исследовать материалы, работать с SQL и создавать рекламные брифы.",
      "Для повторяющихся процессов можно создать собственного агента, сохранить инструкции и использовать его как постоянного цифрового специалиста.",
    ],
    sections: [
      { id: "what-is-agent", title: "Что превращает чат в агента", paragraphs: ["Обычный чат отвечает на сообщение. Агент работает в рамках заранее заданной роли, использует подходящую модель и придерживается нужного формата результата."] },
      { id: "ready-workflows", title: "Готовые рабочие сценарии", paragraphs: ["Готовые агенты Genora.art помогают проверять код, готовить тексты, исследовать материалы, работать с SQL и создавать рекламные брифы."] },
      { id: "custom-agent", title: "Собственный цифровой специалист", paragraphs: ["Для повторяющихся процессов можно создать собственного агента, сохранить инструкции и использовать его как постоянного цифрового специалиста."] },
    ],
    translations: {
      en: { title: "AI agents: from an answer to completed work", excerpt: "Why an agent is more than a prompt and how ready-made roles deliver practical results faster.", topic: "Agents" },
    },
  },
];

export function localizeBlogPost(post: BlogPost, locale: Locale): BlogPost {
  if (post.language === locale || locale === "ru") return post;
  const translation = post.translations?.en;
  return translation ? { ...post, ...translation, language: locale } : { ...post, language: locale };
}

export function selectHomepagePosts(posts: BlogPost[], locale: Locale): BlogPost[] {
  const ordered = [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const direct = ordered.filter((post) => post.language === locale).slice(0, 3);
  const fallback = ordered.filter((post) => !direct.some((item) => item.slug === post.slug)).slice(0, 3 - direct.length);
  return [...direct, ...fallback].map((post) => localizeBlogPost(post, locale));
}
