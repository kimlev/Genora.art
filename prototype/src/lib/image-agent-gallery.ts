import { agentPreviewKind, comparePreviewAssets, isCompareAgentPreview, stillPreviewSrc } from "@/lib/agent-preview";
import { getCatalogAgentOverride } from "@/lib/catalog-agent-overrides";
import { PHOTO_POSE_AGENT_IDS, SCENE_PHOTO_AGENT_IDS } from "@/lib/image-agent-expansions";

export type StudioGalleryTab = "photo" | "video";
export type ImageAgentTag =
  | "all"
  | "photo-processing"
  | "face-retouch"
  | "background"
  | "photo-effects"
  | "hair"
  | "clothes"
  | "locations"
  | "photo-poses"
  | "design";

export const IMAGE_AGENT_TAGS: ImageAgentTag[] = [
  "all",
  "photo-processing",
  "face-retouch",
  "background",
  "photo-effects",
  "hair",
  "clothes",
  "locations",
  "photo-poses",
  "design",
];

export const IMAGE_AGENT_TAG_OF: Record<string, Exclude<ImageAgentTag, "all">> = {
  "privacy-redaction": "photo-processing",
  "pro-headshot": "face-retouch",
  "natural-retouch": "face-retouch",
  "face-swap": "face-retouch",
  "background-removal": "background",
  "background-replace": "background",
  "gta-filter": "background",
  "business-outfit": "clothes",
  "logo-generator": "design",
  "business-card": "design",
  "brand-style-mini": "design",
  "restore-old-photo": "photo-processing",
  "remove-objects": "photo-processing",
  "apply-tan": "photo-processing",
  "remove-tattoo": "photo-processing",
  "character-card": "photo-processing",
  "ai-character-card": "photo-processing",
  "remove-makeup": "face-retouch",
  "add-makeup": "face-retouch",
  "change-eye-color": "face-retouch",
  "plump-lips": "face-retouch",
  "whiten-teeth": "face-retouch",
  "remove-wrinkles": "face-retouch",
  "add-cheekbones": "face-retouch",
  "old-age": "face-retouch",
  "family-photo": "photo-processing",
  "combine-photos": "photo-processing",
  sunflowers: "photo-processing",
  kare: "hair",
  bob: "hair",
  cascade: "hair",
  "long-bob": "hair",
  pixie: "hair",
  shag: "hair",
  undercut: "hair",
  fade: "hair",
  crop: "hair",
  quiff: "hair",
  pompadour: "hair",
  caesar: "hair",
  stubble: "hair",
  "short-boxed-beard": "hair",
  "full-beard": "hair",
  goatee: "hair",
  "van-dyke": "hair",
  ducktail: "hair",
  bald: "hair",
  "remove-beard": "hair",
  rain: "background",
  snow: "background",
  fog: "background",
  thunderstorm: "background",
  "sun-rays": "background",
  overcast: "background",
  sunset: "background",
  "business-suit-man": "clothes",
  "business-suit-woman": "clothes",
  "military-uniform": "clothes",
  "police-uniform": "clothes",
  "medical-uniform": "clothes",
  "firefighter-uniform": "clothes",
  "school-uniform": "clothes",
  "pilot-uniform": "clothes",
  "flight-attendant": "clothes",
  cowboy: "clothes",
  "spider-man": "clothes",
  "iron-man": "clothes",
  "captain-america": "clothes",
  thor: "clothes",
  "black-widow": "clothes",
  pirate: "clothes",
  "medieval-knight": "clothes",
  samurai: "clothes",
  pharaoh: "clothes",
  "venetian-carnival": "clothes",
  "fantasy-mage": "clothes",
  vampire: "clothes",
  steampunk: "clothes",
  astronaut: "clothes",
  gladiator: "clothes",
  "roman-legionary": "clothes",
  elf: "clothes",
  king: "clothes",
  queen: "clothes",
  "rock-star": "clothes",
  santorini: "locations",
  cappadocia: "locations",
  dubai: "locations",
  paris: "locations",
  maldives: "locations",
  iceland: "locations",
  dolomites: "locations",
  kyoto: "locations",
  petra: "locations",
  "new-york": "locations",
  "bora-bora": "locations",
  uyuni: "locations",
  "cartoon-hero": "photo-effects",
  caricature: "photo-effects",
  "hero-3d": "photo-effects",
  drawn: "photo-effects",
  comic: "photo-effects",
  clay: "photo-effects",
  "anime-hero": "photo-effects",
  fantasy: "photo-effects",
  "pixel-illustration": "photo-effects",
  watercolor: "photo-effects",
  "x-ray": "photo-effects",
  "fashion-caricature": "photo-effects",
  "comic-2": "photo-effects",
};

for (const id of PHOTO_POSE_AGENT_IDS) IMAGE_AGENT_TAG_OF[id] = "photo-poses";
for (const id of SCENE_PHOTO_AGENT_IDS) IMAGE_AGENT_TAG_OF[id] = "photo-processing";

/** Порядок карточек в теге «Работа с фоном» после reverse каталога. */
export const WEATHER_AGENT_IDS = [
  "rain",
  "snow",
  "fog",
  "thunderstorm",
  "sun-rays",
  "overcast",
  "sunset",
] as const;

/** Порядок карточек в теге «Замена одежды» после reverse каталога. */
export const CLOTHES_AGENT_IDS = [
  "business-suit-man",
  "business-suit-woman",
  "military-uniform",
  "police-uniform",
  "medical-uniform",
  "firefighter-uniform",
  "school-uniform",
  "pilot-uniform",
  "flight-attendant",
  "cowboy",
  "spider-man",
  "iron-man",
  "captain-america",
  "thor",
  "black-widow",
  "pirate",
  "medieval-knight",
  "samurai",
  "pharaoh",
  "venetian-carnival",
  "fantasy-mage",
  "vampire",
  "steampunk",
  "astronaut",
  "gladiator",
  "roman-legionary",
  "elf",
  "king",
  "queen",
  "rock-star",
] as const;

export const SUIT_COLOR_AGENT_IDS = new Set(["business-suit-man", "business-suit-woman"]);

/** Порядок карточек в теге «Локации» после reverse каталога. */
export const LOCATION_AGENT_IDS = [
  "santorini",
  "cappadocia",
  "dubai",
  "paris",
  "maldives",
  "iceland",
  "dolomites",
  "kyoto",
  "petra",
  "new-york",
  "bora-bora",
  "uyuni",
] as const;

/** Порядок карточек в теге «Прическа» после reverse каталога. */
export const HAIR_AGENT_IDS = [
  "kare",
  "bob",
  "cascade",
  "long-bob",
  "pixie",
  "shag",
  "undercut",
  "fade",
  "crop",
  "quiff",
  "pompadour",
  "caesar",
  "stubble",
  "short-boxed-beard",
  "full-beard",
  "goatee",
  "van-dyke",
  "ducktail",
  "bald",
  "remove-beard",
] as const;

export const HAIR_COLOR_AGENT_IDS = new Set([
  "kare",
  "bob",
  "cascade",
  "long-bob",
  "pixie",
  "shag",
  "undercut",
  "fade",
  "crop",
  "quiff",
  "pompadour",
  "caesar",
  "bald",
]);

/** Порядок карточек в теге «Фотоэффекты» после reverse каталога. */
export const PHOTO_EFFECT_AGENT_IDS = [
  "comic-2",
  "fashion-caricature",
  "pixel-illustration",
  "watercolor",
  "x-ray",
  "cartoon-hero",
  "caricature",
  "hero-3d",
  "drawn",
  "comic",
  "clay",
  "anime-hero",
  "fantasy",
] as const;

const PHOTO_EFFECT_STYLE_OF: Record<(typeof PHOTO_EFFECT_AGENT_IDS)[number], "cartoon" | "illustration" | "three_d"> = {
  "comic-2": "cartoon",
  "fashion-caricature": "illustration",
  "pixel-illustration": "illustration",
  watercolor: "illustration",
  "x-ray": "illustration",
  "cartoon-hero": "cartoon",
  caricature: "illustration",
  "hero-3d": "three_d",
  drawn: "illustration",
  comic: "illustration",
  clay: "three_d",
  "anime-hero": "cartoon",
  fantasy: "illustration",
};

/** Стиль студии, который агент ставит сам, если модель его умеет. */
export function imageAgentPreferredStyle(id: string): "cartoon" | "illustration" | "three_d" | null {
  if (id === "gta-filter") return "illustration";
  return PHOTO_EFFECT_STYLE_OF[id as keyof typeof PHOTO_EFFECT_STYLE_OF] ?? null;
}

export const BEARD_COLOR_AGENT_IDS = new Set([
  "stubble",
  "short-boxed-beard",
  "full-beard",
  "goatee",
  "van-dyke",
  "ducktail",
  "remove-beard",
]);

const OLD_GUIDE_AGENT_IDS = new Set([
  "remove-makeup",
  "add-makeup",
  "change-eye-color",
  "plump-lips",
  "whiten-teeth",
  "remove-wrinkles",
  "add-cheekbones",
  ...HAIR_AGENT_IDS,
]);

/** Колокольчик показывает старый пример «как хорошо / как плохо». */
export function imageAgentUsesOldGuide(id: string): boolean {
  return OLD_GUIDE_AGENT_IDS.has(id);
}

const TEXT_TO_IMAGE_AGENT_IDS = new Set(["logo-generator", "business-card", "brand-style-mini", "ai-character-card"]);

export function imageAgentRequiresPhoto(id: string): boolean {
  return id.length > 0 && !TEXT_TO_IMAGE_AGENT_IDS.has(id);
}

export function imageAgentMatchesTag(id: string, tag: ImageAgentTag): boolean {
  if (tag === "all") return true;
  const overrideTag = getCatalogAgentOverride(id)?.tag;
  if (overrideTag && overrideTag !== "all") return overrideTag === tag;
  return IMAGE_AGENT_TAG_OF[id] === tag;
}

export function imageAgentGuideAssets(id: string): { before?: string; after?: string; still?: string } {
  if (isCompareAgentPreview(id)) return comparePreviewAssets(id);
  if (agentPreviewKind(id) === "photo") return { still: stillPreviewSrc(id) };
  return {};
}
