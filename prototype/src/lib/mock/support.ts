export type SupportTopic = {
  id: string;
  title: string;
  description: string;
};

export const supportTopics: SupportTopic[] = [
  {
    id: "cooperation",
    title: "Сотрудничество",
    description: "Партнёрства, интеграции и коммерческие предложения.",
  },
  {
    id: "billing-refund",
    title: "Оплата или возврат",
    description: "Пополнение, списания и возврат средств.",
  },
  {
    id: "other",
    title: "Другое",
    description: "Любой другой вопрос о Genora.art.",
  },
];

export const supportResponseTime = "Обычно отвечаем в течение рабочего дня";
