import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  AudioLines,
  Baby,
  BookHeart,
  Clapperboard,
  Cloud,
  CloudRain,
  Cpu,
  Disc3,
  DoorOpen,
  Film,
  Flame,
  Flower2,
  Gift,
  Guitar,
  Handshake,
  Headphones,
  Heart,
  HeartHandshake,
  History,
  Leaf,
  Lightbulb,
  Mic2,
  Moon,
  Music,
  Music2,
  PartyPopper,
  Piano,
  Play,
  Radio,
  Rocket,
  Smile,
  Sparkles,
  Sun,
  TreePine,
  Waves,
  Zap,
} from "lucide-react";
import type { MusicTag } from "@/lib/catalog/music-studio";
import { MUSIC_GENRES, MUSIC_MOODS, MUSIC_PURPOSES, MUSIC_STYLES } from "@/lib/catalog/music-studio";
import { mediaModelDescription } from "@/lib/i18n/copy/media-model-use";
import type { Locale } from "@/lib/i18n/types";

export const MUSIC_MODEL_ADVANTAGES: Record<string, string> = {
  "lyria-3-clip-preview": "Ролик на 30 секунд: заставка, рилс или петля.\nБыстро проверить мелодию, не ждать длинную песню.",
  "lyria-3-pro-preview": "Полная песня 1–3 минуты: куплет, припев и бридж.\nРовный голос и понятная структура трека.",
  music_v2: "Пишет песню или инструментал по вашему тексту.\nДлительность до 5 минут — удобно для ролика и подкаста.",
  auto: "Сама выбирает свежую модель Mureka под задачу.\nПесня, инструментал или клон голоса без ручного выбора версии.",
  "mureka-9.5": "Самый живой вокал в линейке Mureka.\nТочнее следует тексту и описанию, чем предыдущие версии.",
  "mureka-9": "Сильнее мелодия и плотнее аранжировка.\nКогда нужна «настоящая» песня, а не короткий набросок.",
  "mureka-8": "Стабильная версия для песни, инструментала и клона голоса.\nПредсказуемый результат, если не нужна новейшая модель.",
  "mureka-o2": "Сначала продумывает сюжет, потом пишет песню.\nЛучше для осмысленного текста, без отдельного инструментала.",
  "music-3": "Песня до 5 минут: свои слова и длительность.\nПол голоса пишется в описание — кнопка подставляет его сама.",
  "music-2.6": "Песня или инструментал по тексту. Длину модель выбирает сама, до ~5 минут.",
  "music-2.5": "Предыдущая MiniMax Music: текст, инструментал, голос в описании.",
  "music-2.0": "Короткое описание стиля и свои слова. Дешевле новых версий.",
  "v1.1-text": "Лицензионный саундтрек по описанию. До 10 минут.\nСвои слова и выбор голоса модель не принимает.",
  "v1.1-video": "Уникальный саундтрек к готовому ролику: длина как у видео.\nКартинка не меняется — на выходе только звук.",
};

export function musicModelAdvantage(id: string, locale: Locale, fallback?: string) {
  return mediaModelDescription(locale, id, fallback) || MUSIC_MODEL_ADVANTAGES[id] || "";
}

export function musicModelAdvantagePlain(id: string, locale: Locale, fallback?: string) {
  return musicModelAdvantage(id, locale, fallback).replace(/\n/g, " ");
}

type GuideItem = MusicTag & { icon: LucideIcon; text: string };

const GENRE_TEXT: Record<string, { icon: LucideIcon; text: string }> = {
  pop: { icon: Mic2, text: "Лёгкая мелодия, понятный припев, голос на первом плане. Подходит для поздравления, сторис и радиоформата." },
  rock: { icon: Guitar, text: "Гитары, ударные и энергия. Берите, когда нужен драйв, гимн или дерзкий куплет." },
  rap: { icon: AudioLines, text: "Ритм и слова важнее длинной мелодии. Удобно, если в тексте много смысла, шутки или обращения." },
  electronic: { icon: Cpu, text: "Синтезаторы, биты и современные эффекты. Для танцпола, рекламы и фона к ролику." },
  rnb: { icon: Disc3, text: "Мягкий грув и чувственный вокал. Признание, вечерняя баллада, тёплый дуэт." },
  soul: { icon: Heart, text: "Живой голос и тёплые гармонии. Когда важны эмоция и «человечность», а не жёсткий бит." },
  jazz: { icon: Music, text: "Импровизация, саксофон, рояль, контрабас. Для бара, саундтрека и спокойной вечеринки." },
  blues: { icon: Music2, text: "Гитара, гармоника и чуть грусти. История, прощание, дорога — когда текст должен звучать честно." },
  country: { icon: TreePine, text: "Акустическая гитара, банджо, простая история. Семейный праздник, дорога, тёплая баллада." },
  classical: { icon: Piano, text: "Оркестр или рояль, без поп-структуры. Интро, титры, торжественный момент." },
  metal: { icon: Flame, text: "Тяжёлые гитары и плотные ударные. Для агрессии, спорта, игрового трейлера." },
  reggae: { icon: Sun, text: "Лёгкий оффбит, бас и гитара. Расслабленное настроение, лето, позитив." },
  soundtrack: { icon: Clapperboard, text: "Музыка под сцену, а не под радиохит. Видео, презентация, титры, атмосфера." },
  disco: { icon: Sparkles, text: "Чёткий танцевальный пульс 70–80-х. Вечеринка, поздравление, ретро-ролик." },
  salsa: { icon: PartyPopper, text: "Латинские ритмы, перкуссия, яркий вокал. Праздник, танец, жаркое настроение." },
  techno: { icon: Waves, text: "Повторяющийся электронный пульс. Клуб, спорт, динамичный монтаж." },
  funk: { icon: Radio, text: "Бас и ритм-гитара «на груве». Бодрое настроение, реклама, танцевальная нарезка." },
  kids: { icon: Baby, text: "Простые слова, мягкий голос, без грубых тем. Колыбельная, мультфильм, детский праздник." },
};

const STYLE_TEXT: Record<string, { icon: LucideIcon; text: string }> = {
  lofi: { icon: Cloud, text: "Тихие пианино и гитара, лёгкий шум плёнки. Обычно без резких ударных — фон для учёбы и сторис." },
  hifi: { icon: Headphones, text: "Чистый студийный звук: вокал, рояль, струнные и ударные слышны отдельно и без «грязи»." },
  analog: { icon: Radio, text: "Тёплые гитары, живые барабаны, плёночная окраска. Как запись с катушечного магнитофона." },
  digital: { icon: Cpu, text: "Синтезаторы, драм-машины, чёткие сэмплы. Современный продюсерский звук без «винтажной» пыли." },
  cinematic: { icon: Film, text: "Струнные, духовые, рояль и широкие пэды. Как саундтрек к кадру, а не как песня в наушниках." },
  studio: { icon: Mic2, text: "Ровный вокал, бас, гитары и ударные как на релизе. Без уличного шума и «живых» огрехов." },
  live: { icon: AudioLines, text: "Гитара, ударные, зал и дыхание зала. Ощущение концерта, а не идеальной студийной склейки." },
  vintage: { icon: History, text: "Старые микрофоны, орган, тёплый бас. Звук пластинки или радио 60–70-х." },
  retro: { icon: Disc3, text: "Синтезаторы, драм-машина и тембры 80-х. Ностальгия, клип, вечеринка в стиле эпохи." },
  dance: { icon: Sparkles, text: "Бочка, бас и синтезатор на первом плане. Чтобы тело само попадало в шаг." },
  cartoon: { icon: Smile, text: "Ксилофон, пикколо, смешные эффекты. Для детей, заставки и лёгкой шутки." },
  acoustic: { icon: Guitar, text: "Гитара, голос, иногда рояль или скрипка. Минимум электроники — как у костра." },
};

const MOOD_TEXT: Record<string, { icon: LucideIcon; text: string }> = {
  joyful: { icon: Smile, text: "Светлая мелодия и открытый голос. Радость без надрыва — праздник, встреча, хорошая новость." },
  brisk: { icon: Zap, text: "Быстрый темп и упругий ритм. Утро, спорт, дорога, когда нужно «включить» человека." },
  cheerful: { icon: PartyPopper, text: "Игривые интонации и лёгкий припев. Шутка, корпоратив, весёлый ролик." },
  calm: { icon: Leaf, text: "Тихий пульс, мягкие аккорды. Фон для вечера, медитации, спокойного текста." },
  melancholic: { icon: CloudRain, text: "Минор и длинные ноты. Воспоминание, осень, тихий разговор с собой." },
  sad: { icon: Cloud, text: "Опущенный голос и простая гармония. Прощание, потеря, честное «мне плохо»." },
  romantic: { icon: Heart, text: "Тёплый вокал и близкая мелодия. Признание, свидание, свадебный танец." },
  gentle: { icon: Flower2, text: "Тише обычного, без резких ударов. Колыбельная, благодарность, нежное письмо." },
  solemn: { icon: Music, text: "Широкие аккорды, ощущение зала. Юбилей, гимн, важный выход на сцену." },
  gloomy: { icon: Moon, text: "Тёмный тембр и низкий пульс. Саундтрек к ночи, саспенсу, тяжёлой сцене." },
  aggressive: { icon: Flame, text: "Жёсткая атака и громкий ритм. Спорт, конфликт, «собраться и идти»." },
  anxious: { icon: AlertTriangle, text: "Нервный ритм и неустойчивые гармонии. Ожидание, тревога, напряжённый монтаж." },
};

const PURPOSE_TEXT: Record<string, { icon: LucideIcon; text: string }> = {
  confession: { icon: HeartHandshake, text: "Песня-обращение: «я люблю», «это про нас». Голос и слова важнее громкого бита." },
  congratulation: { icon: Gift, text: "Именины, свадьба, юбилей. Яркий припев, чтобы человек улыбнулся с первых секунд." },
  lullaby: { icon: Moon, text: "Тихий темп и мягкий голос. Чтобы успокоить ребёнка или закончить день." },
  gratitude: { icon: Heart, text: "Спасибо маме, команде, другу. Тёплый тон, без иронии и тяжёлого драматизма." },
  apology: { icon: BookHeart, text: "«Прости» своими словами. Спокойная мелодия, чтобы текст не звучал как отговорка." },
  farewell: { icon: DoorOpen, text: "Прощание, переезд, конец главы. Чуть грусти, но с достоинством, не истерикой." },
  memory: { icon: History, text: "Про человека, город или год. Как фотоальбом: узнаваемые детали в куплете." },
  support: { icon: Handshake, text: "«Я рядом». Для друга в трудный момент — тепло и опора, без лозунгов." },
  motivation: { icon: Rocket, text: "Собраться, выйти на старт, не сдаться. Бодрый темп и короткий ясный припев." },
  entertainment: { icon: PartyPopper, text: "Просто потанцевать и развлечься. Минимум драмы, максимум грува." },
  inspiration: { icon: Lightbulb, text: "Чтобы захотелось сделать шаг. Светлая мелодия и слова про будущее." },
  reconciliation: { icon: Handshake, text: "После ссоры: мягче, чем признание, честнее, чем шутка. Даёт пространство для «давай сначала»." },
  soundtrack: { icon: Clapperboard, text: "Музыка под видео, а не хит в наушниках. Держит сцену и не перебивает речь." },
  intro: { icon: Play, text: "Короткий вход: подкаст, стрим, заставка канала. Запоминается за 15–30 секунд." },
};

function attach(tags: MusicTag[], extra: Record<string, { icon: LucideIcon; text: string }>): GuideItem[] {
  return tags.map((tag) => ({ ...tag, icon: extra[tag.id]?.icon ?? Music, text: extra[tag.id]?.text ?? "" }));
}

export const MUSIC_GUIDE_GENRES = attach(MUSIC_GENRES, GENRE_TEXT);
export const MUSIC_GUIDE_STYLES = attach(MUSIC_STYLES, STYLE_TEXT);
export const MUSIC_GUIDE_MOODS = attach(MUSIC_MOODS, MOOD_TEXT);
export const MUSIC_GUIDE_PURPOSES = attach(MUSIC_PURPOSES, PURPOSE_TEXT);

export const MUSIC_GUIDE_SECTIONS = [
  { id: "music-genres", title: "Жанры", lead: "Жанр задаёт язык песни: как звучит припев и кому она подойдёт.", items: MUSIC_GUIDE_GENRES },
  { id: "music-styles", title: "Стили", lead: "Стиль говорит, какие инструменты обычно слышны и как «собран» звук.", items: MUSIC_GUIDE_STYLES },
  { id: "music-moods", title: "Настроение", lead: "Настроение — это чувство, которое человек должен получить с первых тактов.", items: MUSIC_GUIDE_MOODS },
  { id: "music-purposes", title: "Назначение", lead: "Зачем трек нужен: подарок, ролик, колыбельная или короткое интро.", items: MUSIC_GUIDE_PURPOSES },
] as const;

export type MusicTileTone = { card: string; icon: string; title: string };

const TILE_TONES: Omit<MusicTileTone, "title">[] = [
  { card: "border-rose-100 bg-rose-50/80 hover:border-rose-200 hover:bg-rose-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-rose-100 text-rose-600" },
  { card: "border-sky-100 bg-sky-50/80 hover:border-sky-200 hover:bg-sky-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-sky-100 text-sky-600" },
  { card: "border-amber-100 bg-amber-50/80 hover:border-amber-200 hover:bg-amber-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-amber-100 text-amber-700" },
  { card: "border-emerald-100 bg-emerald-50/80 hover:border-emerald-200 hover:bg-emerald-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-emerald-100 text-emerald-700" },
  { card: "border-violet-100 bg-violet-50/80 hover:border-violet-200 hover:bg-violet-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-violet-100 text-violet-600" },
  { card: "border-orange-100 bg-orange-50/80 hover:border-orange-200 hover:bg-orange-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-orange-100 text-orange-600" },
  { card: "border-teal-100 bg-teal-50/80 hover:border-teal-200 hover:bg-teal-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-teal-100 text-teal-700" },
  { card: "border-fuchsia-100 bg-fuchsia-50/80 hover:border-fuchsia-200 hover:bg-fuchsia-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-fuchsia-100 text-fuchsia-600" },
  { card: "border-lime-100 bg-lime-50/80 hover:border-lime-200 hover:bg-lime-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-lime-100 text-lime-700" },
  { card: "border-indigo-100 bg-indigo-50/80 hover:border-indigo-200 hover:bg-indigo-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-indigo-100 text-indigo-600" },
  { card: "border-stone-200 bg-stone-50/80 hover:border-stone-300 hover:bg-stone-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-stone-200 text-stone-600" },
  { card: "border-cyan-100 bg-cyan-50/80 hover:border-cyan-200 hover:bg-cyan-100/90 hover:shadow-md hover:-translate-y-0.5", icon: "bg-cyan-100 text-cyan-700" },
];

// Keep the pastel light palette; use restrained, hue-matched surfaces and labels at night.
const DARK_TILE_TONES = [
  { card: "dark:border-[#67414d] dark:bg-[#2b2024] dark:hover:border-[#b56b80] dark:hover:bg-[#34262c]", icon: "dark:bg-[#45303a] dark:text-[#f7aabc]", title: "dark:text-[#f7aabc]" },
  { card: "dark:border-[#405870] dark:bg-[#202934] dark:hover:border-[#7299bd] dark:hover:bg-[#293543]", icon: "dark:bg-[#304458] dark:text-[#a9d3ff]", title: "dark:text-[#a9d3ff]" },
  { card: "dark:border-[#66502c] dark:bg-[#2d251b] dark:hover:border-[#ae8242] dark:hover:bg-[#382e20]", icon: "dark:bg-[#493922] dark:text-[#ffd18a]", title: "dark:text-[#ffd18a]" },
  { card: "dark:border-[#365f4d] dark:bg-[#1c2b25] dark:hover:border-[#639b7d] dark:hover:bg-[#23382e]", icon: "dark:bg-[#294c3b] dark:text-[#9de4c4]", title: "dark:text-[#9de4c4]" },
  { card: "dark:border-[#5b4774] dark:bg-[#282236] dark:hover:border-[#9173b4] dark:hover:bg-[#342a43]", icon: "dark:bg-[#403151] dark:text-[#d6b5ff]", title: "dark:text-[#d6b5ff]" },
  { card: "dark:border-[#745033] dark:bg-[#2d231d] dark:hover:border-[#bb7840] dark:hover:bg-[#392a21]", icon: "dark:bg-[#513724] dark:text-[#ffbd84]", title: "dark:text-[#ffbd84]" },
  { card: "dark:border-[#406269] dark:bg-[#1d2b2c] dark:hover:border-[#6c9ba4] dark:hover:bg-[#26383a]", icon: "dark:bg-[#2c4b50] dark:text-[#91dbe0]", title: "dark:text-[#91dbe0]" },
  { card: "dark:border-[#6d416f] dark:bg-[#2e2231] dark:hover:border-[#a972a9] dark:hover:bg-[#392a3e]", icon: "dark:bg-[#4b3050] dark:text-[#eeafea]", title: "dark:text-[#eeafea]" },
  { card: "dark:border-[#5a673e] dark:bg-[#282c1f] dark:hover:border-[#93a665] dark:hover:bg-[#323826]", icon: "dark:bg-[#414d2e] dark:text-[#c7e18b]", title: "dark:text-[#c7e18b]" },
  { card: "dark:border-[#465a8c] dark:bg-[#22263a] dark:hover:border-[#798fca] dark:hover:bg-[#2b3148]", icon: "dark:bg-[#34436a] dark:text-[#bac8ff]", title: "dark:text-[#bac8ff]" },
  { card: "dark:border-[#625b4c] dark:bg-[#292722] dark:hover:border-[#948b78] dark:hover:bg-[#33302a]", icon: "dark:bg-[#454137] dark:text-[#ded4bf]", title: "dark:text-[#ded4bf]" },
  { card: "dark:border-[#42677a] dark:bg-[#1d2b31] dark:hover:border-[#70a6be] dark:hover:bg-[#253840]", icon: "dark:bg-[#305064] dark:text-[#a2e3f2]", title: "dark:text-[#a2e3f2]" },
] as const;

const TILE_TONE_BY_ID: Record<string, number> = {
  pop: 0, disco: 0, salsa: 0, cheerful: 0, congratulation: 0, entertainment: 0,
  rock: 2, metal: 2, aggressive: 2, motivation: 2, brisk: 2,
  rap: 4, electronic: 1, techno: 1, digital: 1, anxious: 9,
  rnb: 7, soul: 0, romantic: 7, confession: 7, gentle: 7,
  jazz: 2, blues: 9, melancholic: 9, sad: 9, gloomy: 10, farewell: 9,
  country: 8, reggae: 3, acoustic: 8, lofi: 3, calm: 3, lullaby: 3,
  classical: 10, solemn: 10, cinematic: 11, soundtrack: 11, intro: 11,
  kids: 5, cartoon: 5, joyful: 5, inspiration: 8,
  analog: 10, vintage: 10, retro: 7, live: 5, studio: 11, hifi: 1, dance: 0, funk: 5,
  gratitude: 0, apology: 6, memory: 10, support: 6, reconciliation: 6,
};

export function musicTileTone(id: string): MusicTileTone {
  const mapped = TILE_TONE_BY_ID[id];
  const index = mapped ?? [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TILE_TONES.length;
  const light = TILE_TONES[index] ?? TILE_TONES[0];
  const dark = DARK_TILE_TONES[index] ?? DARK_TILE_TONES[0];
  return { card: `${light.card} ${dark.card}`, icon: `${light.icon} ${dark.icon}`, title: dark.title };
}
