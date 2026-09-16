import type { Locale } from "@/lib/i18n";
import type { WelcomeBonusTaskId } from "@/lib/welcome-bonus";

export type WelcomeBonusCopy = {
  teaser: string;
  free: string;
  title: string;
  welcomeTitle: string;
  welcomeNote: string;
  progress: string;
  yourProgress: string;
  creditNote: (date: string) => string;
  inviteTitle: string;
  inviteHint: string;
  copyLink: string;
  copied: string;
  shareEmail: string;
  shareTelegram: string;
  shareWhatsapp: string;
  create: string;
  invite: string;
  inviteMessage: (url: string) => string;
  tasks: Record<WelcomeBonusTaskId, { title: string; hint: string }>;
};

const ru: WelcomeBonusCopy = {
  teaser: "Получи до {k} ★ ",
  free: "бесплатно",
  title: "Задания",
  welcomeTitle: "Приветственный бонус",
  welcomeNote: "За выполнение заданий. Выдается только один раз.",
  progress: "Общий прогресс",
  yourProgress: "Ваш прогресс",
  creditNote: (date) => `Приветственный бонус Вам будет начислен ${date} согласно общему прогрессу`,
  inviteTitle: "Пригласи друзей",
  inviteHint: "Ссылка действует 10 дней. Сообщение уже скопировано.",
  copyLink: "Скопировать ссылку",
  copied: "Скопировано",
  shareEmail: "Почта",
  shareTelegram: "Telegram",
  shareWhatsapp: "WhatsApp",
  create: "Создать",
  invite: "Пригласить",
  inviteMessage: (url) => `Попробуй этот агрегатор нейросетей. Здесь есть все нужные модели. Очень удобный интерфейс: ${url}`,
  tasks: {
    login: { title: "Заходи 5 дней подряд", hint: "Ежедневный вход" },
    texts: { title: "Отправь текстовые запросы", hint: "Ваш прогресс" },
    images: { title: "Создай картинки", hint: "Ваш прогресс" },
    tracks: { title: "Создай треки", hint: "Раздел скоро появится" },
    friends: { title: "Пригласи друзей", hint: "По личной ссылке" },
  },
};

const en: WelcomeBonusCopy = {
  teaser: "Get up to {k} ★ ",
  free: "for free",
  title: "Tasks",
  welcomeTitle: "Welcome bonus",
  welcomeNote: "For completing tasks. Awarded only once.",
  progress: "Overall progress",
  yourProgress: "Your progress",
  creditNote: (date) => `The welcome bonus will be credited to you on ${date} according to your overall progress`,
  inviteTitle: "Invite friends",
  inviteHint: "The link stays valid for 10 days. The message is already copied.",
  copyLink: "Copy link",
  copied: "Copied",
  shareEmail: "Email",
  shareTelegram: "Telegram",
  shareWhatsapp: "WhatsApp",
  create: "Create",
  invite: "Invite",
  inviteMessage: (url) => `Try this AI model aggregator. It has the models you need and a convenient interface: ${url}`,
  tasks: {
    login: { title: "Sign in 5 days in a row", hint: "Daily login" },
    texts: { title: "Send text requests", hint: "Your progress" },
    images: { title: "Create images", hint: "Your progress" },
    tracks: { title: "Create tracks", hint: "Coming soon" },
    friends: { title: "Invite friends", hint: "With your personal link" },
  },
};

const localized: Record<Locale, Pick<WelcomeBonusCopy, "yourProgress" | "creditNote">> = {
  ru: { yourProgress: ru.yourProgress, creditNote: ru.creditNote },
  en: { yourProgress: en.yourProgress, creditNote: en.creditNote },
  zh: {
    yourProgress: "您的进度",
    creditNote: (date) => `欢迎奖金将于 ${date} 根据总体进度发放给您`,
  },
  hi: {
    yourProgress: "आपकी प्रगति",
    creditNote: (date) => `स्वागत बोनस आपको ${date} को कुल प्रगति के अनुसार दिया जाएगा`,
  },
  es: {
    yourProgress: "Tu progreso",
    creditNote: (date) => `El bono de bienvenida se te acreditará el ${date} según tu progreso general`,
  },
  fr: {
    yourProgress: "Votre progression",
    creditNote: (date) => `Le bonus de bienvenue vous sera crédité le ${date} selon votre progression globale`,
  },
  ar: {
    yourProgress: "تقدمك",
    creditNote: (date) => `سيتم إضافة مكافأة الترحيب في ${date} وفقًا للتقدم الإجمالي`,
  },
  pt: {
    yourProgress: "O seu progresso",
    creditNote: (date) => `O bônus de boas-vindas será creditado em ${date} de acordo com o progresso geral`,
  },
  de: {
    yourProgress: "Ihr Fortschritt",
    creditNote: (date) => `Der Willkommensbonus wird Ihnen am ${date} entsprechend dem Gesamtfortschritt gutgeschrieben`,
  },
  ja: {
    yourProgress: "進捗",
    creditNote: (date) => `ウェルカムボーナスは全体の進捗に応じて ${date} に付与されます`,
  },
  it: {
    yourProgress: "I tuoi progressi",
    creditNote: (date) => `Il bonus di benvenuto ti verrà accreditato il ${date} in base ai progressi complessivi`,
  },
  ko: {
    yourProgress: "진행 상황",
    creditNote: (date) => `환영 보너스는 ${date}에 전체 진행 상황에 따라 지급됩니다`,
  },
  tr: {
    yourProgress: "İlerlemeniz",
    creditNote: (date) => `Hoş geldin bonusu ${date} tarihinde genel ilerlemenize göre yüklenecektir`,
  },
  pl: {
    yourProgress: "Twój postęp",
    creditNote: (date) => `Premia powitalna zostanie naliczona ${date} zgodnie z ogólnym postępem`,
  },
  nl: {
    yourProgress: "Jouw voortgang",
    creditNote: (date) => `De welkomstbonus wordt op ${date} bijgeschreven op basis van je totale voortgang`,
  },
  sv: {
    yourProgress: "Din utveckling",
    creditNote: (date) => `Välkomstbonusen krediteras dig den ${date} enligt den samlade utvecklingen`,
  },
  cs: {
    yourProgress: "Váš postup",
    creditNote: (date) => `Uvítací bonus vám bude připsán ${date} podle celkového postupu`,
  },
  el: {
    yourProgress: "Η πρόοδός σας",
    creditNote: (date) => `Το μπόνους καλωσορίσματος θα πιστωθεί στις ${date} σύμφωνα με τη συνολική πρόοδο`,
  },
  ro: {
    yourProgress: "Progresul tău",
    creditNote: (date) => `Bonusul de bun venit va fi acordat pe ${date} conform progresului general`,
  },
};

const copies: Record<string, WelcomeBonusCopy> = { ru, en };

export function welcomeBonusCopy(locale: Locale): WelcomeBonusCopy {
  const base = copies[locale] ?? en;
  const bits = localized[locale] ?? localized.en;
  return { ...base, ...bits };
}
