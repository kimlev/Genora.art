import type { Locale } from "@/lib/i18n/types";

export type SongLandingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  headline: string;
  cta: string;
  imageAlt: string;
  items: Array<{ title: string; text: string }>;
};

const ru: SongLandingCopy = {
  eyebrow: "Музыка / песни",
  title: "Музыка и Песни которые удивляют.",
  subtitle: "Жанр, стиль и назначение помогают модели понять характер трека. Дальше остаётся выбрать голос и нажать генерацию.",
  badge: "Студия песен",
  headline: "От Идеи до готового ХИТА — пара мгновений.",
  cta: "Создать ХИТ",
  imageAlt: "Девушка поёт в микрофон на сцене",
  items: [
    {
      title: "Свой текст или помощь AI",
      text: "Куплеты можно написать вручную или собрать заготовку за один запрос.",
    },
    {
      title: "Жанр, стиль и настроение",
      text: "Кнопки со страницы песен сразу объясняют модели, как должен звучать трек.",
    },
    {
      title: "Несколько моделей в одном месте",
      text: "Создавайте песни, музыку и саундтреки в одном интерфейсе.",
    },
    {
      title: "Оплата по факту",
      text: "Без ежемесячных подписок на каждую нейросеть — только токены за готовый трек.",
    },
  ],
};

const en: SongLandingCopy = {
  eyebrow: "Music / songs",
  title: "Music and songs that surprise.",
  subtitle: "Genre, style, and purpose help the model understand the track. Then you pick a voice and generate.",
  badge: "Song studio",
  headline: "From idea to a finished HIT — in a moment.",
  cta: "Create a HIT",
  imageAlt: "A woman singing into a microphone on stage",
  items: [
    {
      title: "Your lyrics or AI help",
      text: "Write the verses yourself or get a draft in one request.",
    },
    {
      title: "Genre, style, and mood",
      text: "The buttons from the songs page tell the model how the track should sound.",
    },
    {
      title: "Several models in one place",
      text: "Create songs, music, and soundtracks in one interface.",
    },
    {
      title: "Pay as you go",
      text: "No monthly fee for every network — only tokens for the finished track.",
    },
  ],
};

export function songLandingCopy(locale: Locale): SongLandingCopy {
  return locale === "ru" ? ru : en;
}
