export type PricingFeature = {
  id: string;
  label: string;
};

export type PayAsYouGoPlan = {
  id: "payg";
  name: string;
  description: string;
  currency: "RUB" | "USD";
  minimumTopUp: number;
  billingModel: "pay-as-you-go";
  features: PricingFeature[];
  note: string;
};

export const paygPlan: PayAsYouGoPlan = {
  id: "payg",
  name: "Pay-as-you-go",
  description:
    "Единственный тариф Genora.art: пополняете баланс и платите за токены выбранной модели.",
  currency: "RUB",
  minimumTopUp: 300,
  billingModel: "pay-as-you-go",
  features: [
    { id: "all-models", label: "Доступ ко всем моделям" },
    { id: "unified-billing", label: "Единый биллинг и история запросов" },
    { id: "agents-api", label: "Агенты и API без дополнительной подписки" },
    { id: "no-monthly", label: "Без ежемесячной абонентской платы" },
  ],
  note: "Стоимость запроса рассчитывается до отправки — по тарифу модели.",
};

export const pricingPlans = [paygPlan] as const;
