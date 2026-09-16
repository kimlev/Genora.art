import { billedTokensFromUsd } from "@/lib/billing";

export type MusicMode = "song" | "instrumental";
export type MusicVocal = "auto" | "female" | "male" | "duet";
export type MusicTagKind = "genre" | "style" | "mood" | "purpose";
export type MusicTag = { id: string; label: string; labelEn: string; promptEn: string };

export const MUSIC_DURATION_STEPS = [30, 60, 90, 120, 180, 300] as const;
export const AUTO_DURATION_SEC = 210;
export const DEFAULT_MUSIC_BPM = 133;
export const DEFAULT_MUSIC_MULTIPLIER = 2;
export const MUSIC_VIDEO_ACCEPT = ".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm,video/x-m4v";
export const MUSIC_VIDEO_MAX_BYTES = 70 * 1024 * 1024;
export const MUSIC_VIDEO_MIN_SEC = 10;
export const MUSIC_VIDEO_MAX_SEC = 600;
/** MiniMax Music: фиксированный множитель, голос уходит только текстом в промпт. */
export const MINIMAX_MUSIC_MULTIPLIER = 2;
const MINIMAX_VOCAL_PROMPT: Record<Exclude<MusicVocal, "auto">, string> = {
  female: "female lead vocals",
  male: "male lead vocals",
  duet: "male and female duet vocals",
};

export function isMinimaxMusic(provider: string) {
  return provider === "minimax";
}

export function musicModelMultiplier(provider: string, stored?: number | null) {
  if (isMinimaxMusic(provider)) return MINIMAX_MUSIC_MULTIPLIER;
  const value = Number(stored);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MUSIC_MULTIPLIER;
}

export function isAllowedMusicVideoType(type: string) {
  return /video\/(mp4|quicktime|webm|x-m4v)/i.test(type);
}

export function isAllowedMusicVideoFile(file: { name?: string; type?: string }) {
  const type = String(file.type ?? "").trim().toLowerCase();
  if (type && isAllowedMusicVideoType(type)) return true;
  if (type && type !== "application/octet-stream" && !type.startsWith("video/")) return false;
  return /\.(mp4|mov|webm|m4v)$/i.test(String(file.name ?? ""));
}

/** Настоящий MP4/MOV/WebM, не переименованный MP3. */
export function looksLikeMusicVideoBytes(bytes: Uint8Array) {
  if (bytes.length < 8) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return false;
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;
  return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
}

export function musicVideoFileLabel(name: string) {
  const stem = name.replace(/\.[^.]+$/, "").trim() || name;
  return stem.slice(0, 22);
}

export function clampMusicVideoDuration(seconds: number, minSec = MUSIC_VIDEO_MIN_SEC, maxSec = MUSIC_VIDEO_MAX_SEC) {
  if (!Number.isFinite(seconds) || seconds <= 0) return minSec;
  return Math.max(minSec, Math.min(maxSec, Math.round(seconds)));
}

export function musicModelSupportsMode(model: { modes?: readonly string[] | null }, mode: MusicMode) {
  return Boolean(model.modes?.includes(mode));
}

export function musicModeAllowsAutoDuration(
  models: Array<{ available?: boolean; modes?: readonly string[] | null; duration_control?: boolean }>,
  mode: MusicMode,
) {
  return models.some((model) => (
    model.available !== false
    && musicModelSupportsMode(model, mode)
    && model.duration_control === false
  ));
}

export function fallbackMusicModes(modelId: string): MusicMode[] {
  if (modelId === "v1.1-text" || modelId === "v1.1-video") return ["instrumental"];
  if (modelId === "mureka-o2") return ["song"];
  return ["song", "instrumental"];
}

export function musicVideoDurationFits(model: { durations?: number[] }, seconds: number) {
  const steps = model.durations?.length ? model.durations : [MUSIC_VIDEO_MIN_SEC, MUSIC_VIDEO_MAX_SEC];
  return seconds >= Math.min(MUSIC_VIDEO_MIN_SEC, ...steps) && seconds <= Math.max(...steps);
}

export function musicTokenPriceForDuration(
  model: {
    token_prices?: Record<string, number>;
    token_price_auto?: number | null;
    billing_unit?: string | null;
    price_per_second_usd?: number | null;
    price_per_minute_usd?: number | null;
    price_per_track_usd?: number | null;
    price_per_second_cny?: number | null;
    default_duration?: number | null;
    multiplier?: number | null;
    provider?: string;
  },
  durationSec: number,
  autoDuration: boolean,
) {
  if (autoDuration) return model.token_price_auto || 0;
  const keyed = model.token_prices?.[String(durationSec)];
  if (keyed) return keyed;
  return billedTokensFromUsd(estimateMusicCostUsd(model, durationSec), musicModelMultiplier(model.provider ?? "", model.multiplier));
}

/** MiniMax не принимает пол кнопкой — выбранный вокал дописываем в описание. */
export function musicPromptWithVocal(
  provider: string,
  prompt: string,
  vocal?: MusicVocal | null,
  mode?: MusicMode,
) {
  if (!isMinimaxMusic(provider) || mode === "instrumental" || !vocal || vocal === "auto") return prompt;
  const line = `Vocals: ${MINIMAX_VOCAL_PROMPT[vocal]}.`;
  if (prompt.includes(line)) return prompt;
  return prompt.trim() ? `${prompt.trim()}\n${line}` : line;
}
export const MUSIC_LYRICS_HELP_MIN = 10;
/** Общий потолок описания музыки. Для песни лимит считает lyricsCharLimit. */
export const MUSIC_DESCRIPTION_LIMIT = 2000;
export const MUSIC_TITLE_MAX = 100;
export const MUSIC_CUSTOM_TAG_MAX = 200;
export const MUSIC_TAG_LIMITS: Record<MusicTagKind, number> = {
  genre: 3,
  style: 2,
  mood: 2,
  purpose: 2,
};

function tag(id: string, label: string, labelEn: string, promptEn: string): MusicTag {
  return { id, label, labelEn, promptEn };
}

export const MUSIC_GENRES: MusicTag[] = [
  tag("pop", "Поп", "Pop", "catchy melody, clear chorus, vocals in front; good for greetings, stories and radio"),
  tag("rock", "Рок", "Rock", "guitars, drums and energy; use for drive, an anthem or a bold verse"),
  tag("rap", "РЭП", "Rap", "rhythm and words matter more than a long melody; good for meaning, jokes or a direct address"),
  tag("electronic", "Электронная", "Electronic", "synths, beats and modern effects; for the dancefloor, ads and video background"),
  tag("rnb", "R&B", "R&B", "soft groove and sensual vocals; confession, evening ballad, warm duet"),
  tag("soul", "Соул", "Soul", "live voice and warm harmonies; emotion and humanity over a hard beat"),
  tag("jazz", "Джаз", "Jazz", "improvisation, saxophone, piano, double bass; for a bar, soundtrack or calm party"),
  tag("blues", "Блюз", "Blues", "guitar, harmonica and a hint of sadness; a story, farewell or the road"),
  tag("country", "Кантри", "Country", "acoustic guitar, banjo, a simple story; family celebration, the road, a warm ballad"),
  tag("classical", "Классика", "Classical", "orchestra or piano, no pop structure; intro, credits, a solemn moment"),
  tag("metal", "Металл", "Metal", "heavy guitars and dense drums; for aggression, sports, a game trailer"),
  tag("reggae", "Рэгги", "Reggae", "light offbeat, bass and guitar; relaxed mood, summer, positivity"),
  tag("soundtrack", "Саундтрек", "Soundtrack", "music for a scene, not a radio hit; video, presentation, credits, atmosphere"),
  tag("disco", "Диско", "Disco", "clear 70s–80s dance pulse; party, congratulations, retro clip"),
  tag("salsa", "Сальса", "Salsa", "Latin rhythms, percussion, bright vocals; celebration, dance, a hot mood"),
  tag("techno", "Техно", "Techno", "repeating electronic pulse; club, sport, dynamic editing"),
  tag("funk", "Фанк", "Funk", "bass and rhythm guitar on the groove; upbeat mood, ads, a dance cut"),
  tag("kids", "Детская песня", "Children's song", "age-appropriate children's song, simple words, gentle voice, no harsh themes"),
];

export const MUSIC_STYLES: MusicTag[] = [
  tag("lofi", "Лоу-фай", "Lo-fi", "quiet piano and guitar, light tape hiss; usually no sharp drums — background for study and stories"),
  tag("hifi", "Хай-фай", "Hi-fi", "clean studio sound: vocals, piano, strings and drums heard separately without dirt"),
  tag("analog", "Аналоговый", "Analog", "warm guitars, live drums, tape color; like a reel-to-reel recording"),
  tag("digital", "Цифровой", "Digital", "synths, drum machines, clean samples; modern producer sound without vintage dust"),
  tag("cinematic", "Кинематографичный", "Cinematic", "strings, brass, piano and wide pads; a soundtrack to a frame, not a song in headphones"),
  tag("studio", "Студийный", "Studio", "even vocals, bass, guitars and drums like a release; no street noise or live mistakes"),
  tag("live", "Живой", "Live", "guitar, drums, the hall and its breath; a concert feel, not a perfect studio splice"),
  tag("vintage", "Винтажный", "Vintage", "old microphones, organ, warm bass; the sound of a 60s–70s record or radio"),
  tag("retro", "Ретро", "Retro", "synths, drum machine and 80s timbres; nostalgia, a clip, a period party"),
  tag("dance", "Танцевальный", "Dance", "kick, bass and synth in front; so the body falls into step"),
  tag("cartoon", "Мультяшный", "Cartoon", "xylophone, piccolo, funny effects; for kids, an intro and a light joke"),
  tag("acoustic", "Акустический", "Acoustic", "guitar, voice, sometimes piano or violin; minimal electronics — like around a campfire"),
];

export const MUSIC_MOODS: MusicTag[] = [
  tag("joyful", "Радостное", "Joyful", "bright melody and an open voice; joy without strain — a holiday, a meeting, good news"),
  tag("brisk", "Бодрое", "Brisk", "fast tempo and a tight rhythm; morning, sport, the road, when you need to switch a person on"),
  tag("cheerful", "Веселое", "Cheerful", "playful tones and a light chorus; a joke, a corporate event, a fun clip"),
  tag("calm", "Спокойное", "Calm", "quiet pulse, soft chords; background for evening, meditation, a calm text"),
  tag("melancholic", "Меланхоличное", "Melancholic", "minor key and long notes; a memory, autumn, a quiet talk with yourself"),
  tag("sad", "Грустное", "Sad", "lowered voice and simple harmony; farewell, loss, an honest low moment"),
  tag("romantic", "Романтичное", "Romantic", "warm vocals and a close melody; confession, a date, a wedding dance"),
  tag("gentle", "Нежное", "Gentle", "quieter than usual, no sharp hits; lullaby, gratitude, a tender letter"),
  tag("solemn", "Торжественное", "Solemn", "wide chords, a hall feeling; anniversary, anthem, an important entrance"),
  tag("gloomy", "Мрачное", "Gloomy", "dark timbre and a low pulse; soundtrack for night, suspense, a heavy scene"),
  tag("aggressive", "Агрессивное", "Aggressive", "hard attack and loud rhythm; sport, conflict, gather yourself and go"),
  tag("anxious", "Тревожное", "Anxious", "nervous rhythm and unstable harmonies; waiting, anxiety, tense editing"),
];

export const MUSIC_PURPOSES: MusicTag[] = [
  tag("confession", "Признание", "Confession", "a song-address: I love you, this is about us; voice and words over a loud beat"),
  tag("congratulation", "Поздравление", "Congratulations", "birthday, wedding, anniversary; a bright chorus so the person smiles from the first seconds"),
  tag("lullaby", "Колыбельная", "Lullaby", "quiet tempo and a soft voice; to calm a child or end the day"),
  tag("gratitude", "Благодарность", "Gratitude", "thanks to mom, the team, a friend; warm tone, no irony or heavy drama"),
  tag("apology", "Извинение", "Apology", "sorry in your own words; calm melody so the lyrics do not sound like an excuse"),
  tag("farewell", "Прощание", "Farewell", "goodbye, a move, the end of a chapter; a little sadness with dignity, not hysteria"),
  tag("memory", "Память", "Memory", "about a person, a city or a year; like a photo album with recognizable details in the verse"),
  tag("support", "Поддержка", "Support", "I am here; for a friend in a hard moment — warmth and support, no slogans"),
  tag("motivation", "Мотивация", "Motivation", "get ready, start, do not give up; upbeat tempo and a short clear chorus"),
  tag("entertainment", "Развлечение", "Entertainment", "just dance and have fun; minimum drama, maximum groove"),
  tag("inspiration", "Вдохновение", "Inspiration", "so you want to take a step; bright melody and words about the future"),
  tag("reconciliation", "Примирение", "Reconciliation", "after a fight: softer than a confession, more honest than a joke; room to start over"),
  tag("soundtrack", "Саундтрек", "Soundtrack", "music under video, not a hit in headphones; holds the scene and does not interrupt speech"),
  tag("intro", "Интро", "Intro", "a short entrance for a podcast, stream or channel sting; memorable in 15–30 seconds"),
];

export const MUSIC_TAG_SETS: Array<{ kind: MusicTagKind; tags: MusicTag[] }> = [
  { kind: "genre", tags: MUSIC_GENRES },
  { kind: "style", tags: MUSIC_STYLES },
  { kind: "mood", tags: MUSIC_MOODS },
  { kind: "purpose", tags: MUSIC_PURPOSES },
];

export const SONG_STRUCTURE = [
  { id: "Intro", label: "Вступление", labelEn: "Intro" },
  { id: "Verse", label: "Куплет", labelEn: "Verse" },
  { id: "Pre-Chorus", label: "Предприпев", labelEn: "Pre-chorus" },
  { id: "Chorus", label: "Припев", labelEn: "Chorus" },
  { id: "Bridge", label: "Переход", labelEn: "Bridge" },
  { id: "Outro", label: "Финал", labelEn: "Outro" },
] as const;

export function localizedMusicTagName(tag: { label: string; labelEn: string }, locale: string) {
  return locale === "ru" ? tag.label : tag.labelEn;
}

export function musicDbId(provider: string, modelId: string) {
  return `music:${provider}:${modelId}`;
}

export function splitMusicTagValues(value?: string | null) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function musicTagLabel(tags: MusicTag[], value?: string | null) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  return tags.find((item) => item.id === raw)?.label || raw;
}

export function musicTagLabels(tags: MusicTag[], value?: string | null) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const parts = splitMusicTagValues(raw);
  if (parts.some((item) => tags.some((tag) => tag.id === item))) {
    return parts.map((item) => tags.find((tag) => tag.id === item)?.label || item).join(", ");
  }
  return raw;
}

export function musicTagPrompt(tags: MusicTag[], value?: string | null) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  if (tags.some((tag) => raw.includes(`${tag.labelEn}:`))) return raw;
  const parts = splitMusicTagValues(raw);
  if (parts.some((item) => tags.some((tag) => tag.id === item))) {
    return parts.map((item) => {
      const tag = tags.find((entry) => entry.id === item);
      return tag ? `${tag.labelEn}: ${tag.promptEn}` : item;
    }).join("; ");
  }
  return raw;
}

const DURATION_UNITS: Record<string, { sec: string; min: string }> = {
  ru: { sec: "сек", min: "мин" },
  en: { sec: "s", min: "min" },
  zh: { sec: "秒", min: "分钟" },
  hi: { sec: "सेकंड", min: "मिनट" },
  es: { sec: "s", min: "min" },
  fr: { sec: "s", min: "min" },
  ar: { sec: "ث", min: "د" },
  pt: { sec: "s", min: "min" },
  de: { sec: "Sek.", min: "Min." },
  ja: { sec: "秒", min: "分" },
  it: { sec: "s", min: "min" },
  ko: { sec: "초", min: "분" },
  tr: { sec: "sn", min: "dk" },
  pl: { sec: "s", min: "min" },
  nl: { sec: "s", min: "min" },
  sv: { sec: "s", min: "min" },
  cs: { sec: "s", min: "min" },
  el: { sec: "δευτ.", min: "λεπ." },
  ro: { sec: "s", min: "min" },
};

export function durationLabel(seconds: number, locale = "ru") {
  const { sec, min } = DURATION_UNITS[locale] ?? DURATION_UNITS.en;
  if (seconds === 30) return `30 ${sec}`;
  if (seconds === 60) return `1 ${min}`;
  if (seconds === 90) return `90 ${sec}`;
  if (seconds === 120) return `2 ${min}`;
  if (seconds === 180) return `3 ${min}`;
  if (seconds === 210) return `3.5 ${min}`;
  if (seconds === 300) return `5 ${min}`;
  if (seconds % 60 === 0) return `${seconds / 60} ${min}`;
  return `${seconds} ${sec}`;
}

export function formatTrackTime(seconds?: number | null) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function tempoName(bpm: number, locale = "ru") {
  if (locale === "ru") {
    if (bpm <= 76) return "Адажио";
    if (bpm <= 108) return "Анданте";
    if (bpm <= 120) return "Модерато";
    if (bpm <= 168) return "Аллегро";
    return "Престо";
  }
  if (bpm <= 76) return "Adagio";
  if (bpm <= 108) return "Andante";
  if (bpm <= 120) return "Moderato";
  if (bpm <= 168) return "Allegro";
  return "Presto";
}

/** Пустые метки вроде [Intro]/[Theme] — это не описание музыки. */
export function isMusicHelpSkeleton(text: string) {
  const leftover = text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  return leftover.length < 24;
}

/** Сколько символов текста песни влезает в выбранный хронометраж и темп. */
export function lyricsCharLimit(durationSec: number, bpm: number) {
  const seconds = Math.max(30, Math.min(300, durationSec || AUTO_DURATION_SEC));
  const tempo = Math.max(66, Math.min(200, bpm || DEFAULT_MUSIC_BPM));
  return Math.max(80, Math.min(3000, Math.round(seconds * tempo * 0.05)));
}

export function estimateMusicCostUsd(input: {
  billing_unit?: string | null;
  price_per_track_usd?: number | null;
  price_per_minute_usd?: number | null;
  price_per_second_usd?: number | null;
  price_per_second_cny?: number | null;
  default_duration?: number | null;
}, durationSec: number) {
  const seconds = Math.max(1, durationSec || input.default_duration || 120);
  if (input.billing_unit === "audio_minute") return ((input.price_per_minute_usd ?? 0) * seconds) / 60;
  if (input.billing_unit === "audio_second") {
    if (input.price_per_second_usd != null) return input.price_per_second_usd * seconds;
    return ((input.price_per_second_cny ?? 0) * seconds) / 7.2;
  }
  return input.price_per_track_usd ?? 0;
}

export function musicModelTokenPrices(
  model: {
    duration_control?: boolean;
    durations?: number[];
    default_duration?: number | null;
    billing_unit?: string | null;
    price_per_track_usd?: number | null;
    price_per_minute_usd?: number | null;
    price_per_second_usd?: number | null;
    price_per_second_cny?: number | null;
  },
  multiplier: number,
): { token_prices: Record<string, number>; token_price_auto: number | null } {
  const durations = model.duration_control === false
    ? []
    : (model.durations?.length ? model.durations : [...MUSIC_DURATION_STEPS]);
  const token_prices = Object.fromEntries(
    (durations.length ? durations : [model.default_duration || 180]).map((duration) => [
      String(duration),
      billedTokensFromUsd(estimateMusicCostUsd(model, duration), multiplier),
    ]),
  );
  return {
    token_prices,
    token_price_auto: model.duration_control === false
      ? billedTokensFromUsd(estimateMusicCostUsd(model, model.default_duration || 180), multiplier)
      : null,
  };
}

export function requestIdSuffix(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  const hex = id.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length) {
    const value = Number.parseInt(hex.slice(-5).padStart(4, "0"), 16);
    if (Number.isFinite(value)) return String(Math.abs(value) % 10_000).padStart(4, "0");
  }
  return "0000";
}

export function untitledTrackTitle(requestId: string, label: string): string {
  return `${label}_${requestIdSuffix(requestId)}`;
}

export function displayMusicTitle(title: string, prompt: string, requestId: string, label: string): string {
  const trimmed = title.trim();
  const story = prompt.trim();
  if (!trimmed || trimmed === "Без названия" || trimmed === story || trimmed === story.slice(0, 80)) {
    return untitledTrackTitle(requestId, label);
  }
  return trimmed;
}
