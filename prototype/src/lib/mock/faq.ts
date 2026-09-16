export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: "billing" | "product" | "agents";
};

export const faqItems: FaqItem[] = [
  {
    id: "payg-how",
    category: "billing",
    question: "Как работает Pay-as-you-go в Genora.art?",
    answer:
      "Вы пополняете баланс и платите за каждый запрос по тарифу выбранной модели. Подписок и скрытых лимитов нет — списание только за фактическое использование.",
  },
  {
    id: "minimum-topup",
    category: "billing",
    question: "Какое минимальное пополнение?",
    answer:
      "Минимальное пополнение — от 300 ₽. Средства не сгорают и расходуются по мере запросов к моделям.",
  },
  {
    id: "model-switch",
    category: "product",
    question: "Можно ли менять модель в одном чате?",
    answer:
      "Да. Genora.art сохраняет контекст диалога, а стоимость пересчитывается по тарифу новой модели.",
  },
  {
    id: "price-before-send",
    category: "billing",
    question: "Вижу ли я цену до отправки?",
    answer:
      "Да. Перед отправкой показывается ориентировочная стоимость запроса для выбранной модели.",
  },
  {
    id: "agents-vs-chat",
    category: "agents",
    question: "Чем агенты отличаются от обычного чата?",
    answer:
      "Агенты — готовые пресеты с системным промптом и настройками под типовые задачи: код, перевод, маркетинг и анализ.",
  },
  {
    id: "subscriptions",
    category: "billing",
    question: "Есть ли подписки или тарифные планы?",
    answer:
      "Нет. В Genora.art один тариф — Pay-as-you-go. Вы платите только за использование, без ежемесячных планов.",
  },
];

export function getFaqByCategory(category: FaqItem["category"]): FaqItem[] {
  return faqItems.filter((item) => item.category === category);
}
