export type LegalSection = {
  title: string;
  body: string | string[];
  items?: string[];
};

export type LegalDocumentDefinition = {
  slug: string;
  title: string;
  shortTitle: string;
  fileName: string;
  description: string;
  titleEn: string;
  shortTitleEn: string;
  descriptionEn: string;
};

export const legalDocuments: LegalDocumentDefinition[] = [
  {
    slug: "terms",
    title: "Условия использования Genora.art",
    shortTitle: "Условия использования",
    fileName: "terms.md",
    description: "Правила доступа и использования сервиса Genora.art.",
    titleEn: "Genora.art Terms of Use",
    shortTitleEn: "Terms of Use",
    descriptionEn: "Rules for accessing and using the Genora.art service.",
  },
  {
    slug: "privacy",
    title: "Политика конфиденциальности Genora.art",
    shortTitle: "Конфиденциальность",
    fileName: "privacy.md",
    description: "Как Genora.art получает, использует и защищает персональные данные.",
    titleEn: "Genora.art Privacy Policy",
    shortTitleEn: "Privacy",
    descriptionEn: "How Genora.art collects, uses, and protects personal data.",
  },
  {
    slug: "cookies",
    title: "Политика cookies Genora.art",
    shortTitle: "Cookies",
    fileName: "cookies.md",
    description: "Использование cookies и локального хранилища в Genora.art.",
    titleEn: "Genora.art Cookie Policy",
    shortTitleEn: "Cookies",
    descriptionEn: "How Genora.art uses cookies and local storage.",
  },
  {
    slug: "refund-policy",
    title: "Политика возврата средств Genora.art",
    shortTitle: "Возврат средств",
    fileName: "refund-policy.md",
    description: "Условия и порядок рассмотрения запросов на возврат средств.",
    titleEn: "Genora.art Refund Policy",
    shortTitleEn: "Refunds",
    descriptionEn: "How Genora.art reviews and processes refund requests.",
  },
  {
    slug: "acceptable-use",
    title: "Политика допустимого использования Genora.art",
    shortTitle: "Допустимое использование",
    fileName: "acceptable-use.md",
    description: "Правила безопасного и законного использования AI-сервиса.",
    titleEn: "Genora.art Acceptable Use Policy",
    shortTitleEn: "Acceptable Use",
    descriptionEn: "Rules for safe and lawful use of the AI service.",
  },
  {
    slug: "security",
    title: "Политика безопасности Genora.art",
    shortTitle: "Безопасность",
    fileName: "security.md",
    description: "Организационные и технические меры защиты Genora.art.",
    titleEn: "Genora.art Security Policy",
    shortTitleEn: "Security",
    descriptionEn: "Organizational and technical safeguards used by Genora.art.",
  },
  {
    slug: "account-deletion",
    title: "Политика удаления аккаунта Genora.art",
    shortTitle: "Удаление аккаунта",
    fileName: "account-deletion.md",
    description: "Порядок деактивации и удаления аккаунта Genora.art.",
    titleEn: "Genora.art Account Deletion Policy",
    shortTitleEn: "Account Deletion",
    descriptionEn: "How to deactivate and delete a Genora.art account.",
  },
  {
    slug: "subprocessors",
    title: "Субпроцессоры и получатели данных Genora.art",
    shortTitle: "Субпроцессоры",
    fileName: "subprocessors.md",
    description: "Категории поставщиков и получателей данных Genora.art.",
    titleEn: "Genora.art Subprocessors and Data Recipients",
    shortTitleEn: "Subprocessors",
    descriptionEn: "Categories of Genora.art vendors and data recipients.",
  },
  {
    slug: "intellectual-property",
    title: "Политика интеллектуальной собственности Genora.art",
    shortTitle: "Интеллектуальная собственность",
    fileName: "intellectual-property.md",
    description: "Правила использования контента, бренда и AI-результатов.",
    titleEn: "Genora.art Intellectual Property Policy",
    shortTitleEn: "Intellectual Property",
    descriptionEn: "Rules for using content, the brand, and AI outputs.",
  },
  {
    slug: "dpa",
    title: "Соглашение об обработке персональных данных (DPA)",
    shortTitle: "DPA",
    fileName: "dpa.md",
    description: "Условия обработки персональных данных клиентов Genora.art.",
    titleEn: "Genora.art Data Processing Agreement (DPA)",
    shortTitleEn: "DPA",
    descriptionEn: "Terms for processing personal data of Genora.art customers.",
  },
];

export function getLegalDocument(slug: string): LegalDocumentDefinition | undefined {
  return legalDocuments.find((document) => document.slug === slug);
}

/** Legal texts exist in Russian and English. Every non-Russian UI language uses English. */
export function legalTextLocale(locale: string): "ru" | "en" {
  return locale === "ru" ? "ru" : "en";
}
