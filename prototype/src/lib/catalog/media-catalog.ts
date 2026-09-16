export type MediaCatalogModel = {
  id: string;
  name: string;
  provider: string;
  kind: "video" | "music";
  description: string;
};

export const FALLBACK_VIDEO_MODELS: MediaCatalogModel[] = [
  { id: "veo-3.1", name: "Veo 3.1", provider: "Google", kind: "video", description: "Киношное качество, звук, первый и последний кадр, референс" },
  { id: "veo-3.1-fast", name: "Veo 3.1 Fast", provider: "Google", kind: "video", description: "Быстрее Veo, звук, первый и последний кадр" },
  { id: "veo-3.1-lite", name: "Veo 3.1 Lite", provider: "Google", kind: "video", description: "Дешёвый Veo для черновиков" },
  { id: "omni-1.1-flash", name: "Omni 1.1 Flash", provider: "Google", kind: "video", description: "Текст, картинка, референс и правка своего ролика. 4–10 сек" },
  { id: "wan-3.0", name: "Wan 3.0", provider: "Alibaba", kind: "video", description: "До 30 секунд, звук, референс и видео из видео" },
  { id: "wan-2.7", name: "Wan 2.7", provider: "Alibaba", kind: "video", description: "Первый и последний кадр, референс, звук" },
  { id: "wan-2.6", name: "Wan 2.6", provider: "Alibaba", kind: "video", description: "Короткие ролики 5 или 10 секунд" },
  { id: "hailuo-3", name: "Hailuo H3", provider: "MiniMax", kind: "video", description: "Референс до 9 картинок и видео из видео, 2K, звук" },
  { id: "hailuo-2.3", name: "Hailuo 2.3", provider: "MiniMax", kind: "video", description: "Лица и мимика, в основном оживить фото" },
  { id: "seedance-2.5", name: "Seedance 2.5", provider: "ByteDance", kind: "video", description: "До 30 секунд: фото человека можно подставить в ролик" },
  { id: "seedance-2.0", name: "Seedance 2.0", provider: "ByteDance", kind: "video", description: "До 4K: фото человека вместе с роликом" },
  { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast", provider: "ByteDance", kind: "video", description: "Быстрее 2.0: фото человека вместе с роликом" },
  { id: "seedance-2.0-mini", name: "Seedance 2.0 Mini", provider: "ByteDance", kind: "video", description: "Короткие ролики 480p и 720p со звуком" },
  { id: "seedance-1-5-pro", name: "Seedance 1.5 Pro", provider: "ByteDance", kind: "video", description: "До 12 секунд, звук можно выключить дешевле" },
  { id: "kling-v3.0-pro", name: "Kling 3.0 Pro", provider: "Kling", kind: "video", description: "Сильное движение, первый и последний кадр, звук" },
  { id: "kling-v3.0-std", name: "Kling 3.0 Standard", provider: "Kling", kind: "video", description: "Дешевле Pro, те же режимы" },
  { id: "kling-video-o1", name: "Kling Video O1", provider: "Kling", kind: "video", description: "5 или 10 секунд, первый и последний кадр" },
  { id: "kling-2.6-mc-std", name: "Kling 2.6 Motion Control", provider: "Kling", kind: "video", description: "Движение с ролика переносится на человека с фото" },
  { id: "kling-2.6-mc-pro", name: "Kling 2.6 Motion Control Pro", provider: "Kling", kind: "video", description: "Тот же перенос движения, выше качество" },
  { id: "kling-3.0-mc-std", name: "Kling 3.0 Motion Control", provider: "Kling", kind: "video", description: "Новее 2.6: точнее лицо и жест" },
  { id: "kling-3.0-mc-pro", name: "Kling 3.0 Motion Control Pro", provider: "Kling", kind: "video", description: "Самый точный перенос движения Kling" },
  { id: "flux-3-video", name: "FLUX.3 Video", provider: "Black Forest Labs", kind: "video", description: "Текст и оживить фото, до 20 секунд" },
  { id: "gen-4.5", name: "Runway Gen-4.5", provider: "Runway", kind: "video", description: "Оживить фото и текст в ролик без звука" },
];

export const FALLBACK_MUSIC_MODELS: MediaCatalogModel[] = [
  { id: "lyria-3-clip-preview", name: "Lyria 3 Clip", provider: "Google", kind: "music", description: "Ролик на 30 секунд: заставка, рилс или петля. Быстро проверить мелодию." },
  { id: "lyria-3-pro-preview", name: "Lyria 3 Pro", provider: "Google", kind: "music", description: "Полная песня 1–3 минуты: куплет, припев и бридж." },
  { id: "music_v2", name: "Eleven Music v2", provider: "ElevenLabs", kind: "music", description: "Песня или инструментал по вашему тексту. До 5 минут." },
  { id: "auto", name: "Mureka Auto", provider: "Mureka", kind: "music", description: "Сама выбирает свежую модель: песня, инструментал или клон голоса." },
  { id: "mureka-9.5", name: "Mureka V9.5", provider: "Mureka", kind: "music", description: "Самый живой вокал. Точнее следует тексту и описанию." },
  { id: "mureka-9", name: "Mureka V9", provider: "Mureka", kind: "music", description: "Сильнее мелодия и плотнее аранжировка." },
  { id: "mureka-8", name: "Mureka V8", provider: "Mureka", kind: "music", description: "Стабильная версия для песни, инструментала и клона голоса." },
  { id: "mureka-o2", name: "Mureka O2", provider: "Mureka", kind: "music", description: "Сначала продумывает сюжет, потом пишет песню." },
  { id: "music-3", name: "MiniMax Music 3", provider: "MiniMax", kind: "music", description: "Песня до 5 минут: свои слова, длительность, голос в описании." },
  { id: "music-2.6", name: "MiniMax Music 2.6", provider: "MiniMax", kind: "music", description: "Песня по тексту. Длину модель выбирает сама." },
  { id: "music-2.5", name: "MiniMax Music 2.5", provider: "MiniMax", kind: "music", description: "Предыдущая версия MiniMax Music." },
  { id: "music-2.0", name: "MiniMax Music 2.0", provider: "MiniMax", kind: "music", description: "Короткий стиль и свои слова. Дешевле новых версий." },
  { id: "v1.1-text", name: "Sonilo Text to Music", provider: "Sonilo", kind: "music", description: "Лицензионный саундтрек по описанию. До 10 минут." },
  { id: "v1.1-video", name: "Sonilo Video to Music", provider: "Sonilo", kind: "music", description: "Уникальный саундтрек к ролику: длина как у видео." },
];
