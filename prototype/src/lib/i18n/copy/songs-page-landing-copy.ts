import type { Locale } from "@/lib/i18n/types";

export type SongsLandingChip = { type: string; value: string };

export type SongsPageLandingCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  heroCta: string;
  heroSecondary: string;
  tags: string[];
  stepsTitle: string;
  stepsLead: string;
  steps: Array<{ title: string; text: string; hint?: string; chips?: SongsLandingChip[] }>;
  reasonsTitle: string;
  reasonsLead: string;
  reasons: Array<{ title: string; text: string }>;
  extraEyebrow: string;
  extraTitle: string;
  extraLead: string;
  extraHighlight: string;
  extraItems: Array<{ title: string; text: string }>;
  extraSpecs: { model: string; modelName: string; file: string; duration: string; format: string };
  extraCta: string;
  seoTitle: string;
  seoDescription: string;
};

const ru: SongsPageLandingCopy = {
  heroEyebrow: "Студия песен",
  heroTitle: "Создайте свою первую песню сейчас",
  heroLead: "Напишите текст сами или попросите Помощь AI. Выберите жанр, голос и модель — готовый трек сразу окажется в вашей галерее.",
  heroCta: "Создать свою песню",
  heroSecondary: "Смотреть тарифы",
  tags: ["Голос", "Жанр", "Стиль", "Настроение", "Назначение"],
  stepsTitle: "От идеи до готового трека",
  stepsLead: "Опишите сцену, выберите, как должен звучать трек, и получите результат. Всё в одном окне, без отдельной подписки на каждую студию.",
  steps: [
    {
      title: "Опишите",
      text: "Добавьте свой текст или короткое описание. Помощь AI соберёт куплеты, если начинаете с нуля.",
      hint: "Ночная поездка, огни города, ностальгический хип-хоп…",
    },
    {
      title: "Соберите звучание",
      text: "Жанр, стиль, настроение и назначение сразу объясняют модели характер трека. Голос — мужской, женский, дуэт или инструментал.",
      chips: [
        { type: "Жанр", value: "Поп" },
        { type: "Стиль", value: "Лоу-фай" },
        { type: "Настроение", value: "Радостное" },
        { type: "Назначение", value: "Поздравление" },
      ],
    },
    {
      title: "Наслаждайтесь результатом",
      text: "Модель напишет полный трек и автоматически сохранит его в галерею. Лицензия предоставлена.",
    },
  ],
  reasonsTitle: "Создайте песню, которую хотите.",
  reasonsLead: "Узнайте, что мешает вам создать идеальную композицию",
  reasons: [
    {
      title: "Пока это только идея?",
      text: "Промпт или свой текст. Превратите их в мелодию, аранжировку или вокал в одной студии.",
    },
    {
      title: "Голос не подходит песне?",
      text: "Мужской, женский, дуэт. Выберите направление, которое будет соответствовать вашим ожиданиям.",
    },
    {
      title: "Не хотите прыгать по сервисам?",
      text: "Несколько моделей в одном интерфейсе. Генерируйте и сравнивайте результат.",
    },
    {
      title: "Все результаты звучат шаблонно?",
      text: "Жанр, стиль, настроение и назначение лучше зададут направление и помогут достигнуть цели.",
    },
    {
      title: "Воспоминание заслуживает большего?",
      text: "Имена, истории и повод. Соберите личную песню к празднику, прощанию или короткому ролику.",
    },
  ],
  extraEyebrow: "Песня под видео",
  extraTitle: "Загрузите ролик — получите саундтрек",
  extraLead: "Если нужна не песня, а лицензионная музыка к ролику, загрузите ролик и получите готовый саундтрек.",
  extraHighlight: "саундтрек",
  extraItems: [
    { title: "Ролик как референс", text: "Модель слышит задачу целиком: сцена, темп и длина ближе к вашему кадру." },
    { title: "Саундтрек, а не фон из стока", text: "Музыка под монтаж, сторис или презентацию — без чужого трека из библиотеки." },
    { title: "Один баланс", text: "Песня, инструментал и саундтрек списываются с тех же токенов, что и остальной Genora.art." },
  ],
  extraSpecs: {
    model: "Модель",
    modelName: "Sonilo",
    file: "файл до 70 МБ",
    duration: "длина ролика до 10 мин",
    format: "формат: MP4",
  },
  extraCta: "Собрать саундтрек",
  seoTitle: "Создайте свою первую песню сейчас",
  seoDescription: "Напишите текст или попросите Помощь AI. Выберите жанр, голос и модель — готовый трек сохранится в галерее Genora.art.",
};

const en: SongsPageLandingCopy = {
  heroEyebrow: "Song studio",
  heroTitle: "Create your first song now",
  heroLead: "Write the lyrics yourself or ask AI for help. Pick a genre, a voice, and a model — the finished track lands in your gallery.",
  heroCta: "Create your song",
  heroSecondary: "See pricing",
  tags: ["Voice", "Genre", "Style", "Mood", "Purpose"],
  stepsTitle: "From idea to a finished track",
  stepsLead: "Describe the scene, choose how the track should sound, and get the result. One window — no extra subscription for every studio.",
  steps: [
    {
      title: "Describe",
      text: "Add your lyrics or a short prompt. AI Help can draft verses if you are starting from scratch.",
      hint: "Night drive, city lights, a nostalgic hip-hop beat…",
    },
    {
      title: "Shape the sound",
      text: "Genre, style, mood, and purpose tell the model the character of the track. Voice can be male, female, a duet, or instrumental.",
      chips: [
        { type: "Genre", value: "Pop" },
        { type: "Style", value: "Lo-fi" },
        { type: "Mood", value: "Joyful" },
        { type: "Purpose", value: "Congratulations" },
      ],
    },
    {
      title: "Enjoy the result",
      text: "The model writes a full track and saves it to your gallery automatically. The license is included.",
    },
  ],
  reasonsTitle: "Create the song you want.",
  reasonsLead: "See what is keeping you from the composition you want",
  reasons: [
    {
      title: "Still just an idea?",
      text: "A prompt or your own lyrics. Turn them into melody, arrangement, or vocals in one studio.",
    },
    {
      title: "The voice does not fit?",
      text: "Male, female, duet. Choose the direction that matches what you expect.",
    },
    {
      title: "Tired of jumping between apps?",
      text: "Several models in one interface. Generate and compare the result.",
    },
    {
      title: "Everything sounds generic?",
      text: "Genre, style, mood, and purpose set a clearer direction and help you reach the goal.",
    },
    {
      title: "Does a memory deserve more?",
      text: "Names, stories, and a reason. Make a personal song for a celebration, a goodbye, or a short video.",
    },
  ],
  extraEyebrow: "Song for video",
  extraTitle: "Upload a clip — get a soundtrack",
  extraLead: "If you need licensed music for a clip rather than a song, upload the video and get a finished soundtrack.",
  extraHighlight: "soundtrack",
  extraItems: [
    { title: "The clip as a reference", text: "The model sees the whole task: scene, tempo, and length closer to your cut." },
    { title: "A soundtrack, not stock audio", text: "Music for an edit, a story, or a presentation — without someone else’s library track." },
    { title: "One balance", text: "Songs, instrumentals, and soundtracks use the same tokens as the rest of Genora.art." },
  ],
  extraSpecs: {
    model: "Model",
    modelName: "Sonilo",
    file: "file up to 70 MB",
    duration: "clip length up to 10 min",
    format: "format: MP4",
  },
  extraCta: "Make a soundtrack",
  seoTitle: "Create your first song now",
  seoDescription: "Write lyrics or ask AI for help. Pick a genre, a voice, and a model — the finished track is saved in your Genora.art gallery.",
};

export function songsPageLandingCopy(locale: Locale): SongsPageLandingCopy {
  return locale === "ru" ? ru : en;
}
