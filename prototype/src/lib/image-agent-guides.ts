import { CLOTHES_AGENT_IDS, LOCATION_AGENT_IDS } from "@/lib/image-agent-gallery";
import { PHOTO_POSE_AGENTS, SCENE_PHOTO_AGENTS, imageAgentExpansion } from "@/lib/image-agent-expansions";

export type ImageAgentMultiGuide = {
  sources: string[];
  result: string;
  sourceClassNames?: string[];
  sourceCaption?: "slot" | "good";
  slotLike?: boolean;
  openSourceIndex?: number;
};

export type ImageAgentRatedGuide = {
  good: string[];
  bad: string;
  uploadFromGuide?: boolean;
  objectFit?: "cover" | "contain";
};

const FACE_SWAP_HINTS: Record<string, [string, string]> = {
  ru: ["Кого поставить", "Чьё лицо меняем"],
  en: ["Who to put in", "Whose face we change"],
  es: ["A quién poner", "Cara que cambiamos"],
  fr: ["Qui placer", "Visage à remplacer"],
  de: ["Wen einsetzen", "Wessen Gesicht"],
  it: ["Chi inserire", "Che volto cambiare"],
  pt: ["Quem colocar", "Rosto a trocar"],
  pl: ["Kogo wstawić", "Czyją twarz zmieniamy"],
  tr: ["Kimi koyacağız", "Kimin yüzünü değiştiriyoruz"],
  sv: ["Vem ska in", "Vems ansikte byts"],
  cs: ["Koho vložit", "Čí obličej měníme"],
  hi: ["किसे लगाना है", "किसका चेहरा बदलना है"],
  ar: ["من نضع", "وجه من نغيّر"],
  zh: ["放谁的脸", "换谁的脸"],
  ja: ["入れる顔", "替える顔"],
  ko: ["넣을 얼굴", "바꿀 얼굴"],
  nl: ["Wie erin", "Wiens gezicht"],
  el: ["Ποιον βάζουμε", "Ποιανού το πρόσωπο"],
  ro: ["Pe cine punem", "Ale cui față schimbăm"],
};

const MULTI_GUIDES: Record<string, ImageAgentMultiGuide> = {
  "face-swap": {
    sources: ["/agents/face-swap-1.jpg", "/agents/face-swap-2.jpg"],
    result: "/agents/face-swap-after.jpg",
  },
  "family-photo": {
    sources: ["/agents/family-photo-1.jpg", "/agents/family-photo-2.jpg", "/agents/family-photo-3.jpg"],
    result: "/agents/family-photo-after.jpg",
  },
  "combine-photos": {
    sources: ["/agents/combine-photos-1.jpg", "/agents/combine-photos-2.jpg"],
    result: "/agents/combine-photos-after.jpg",
  },
  sunflowers: {
    sources: ["/agents/sunflowers-1.jpg", "/agents/sunflowers-2.jpg"],
    result: "/agents/sunflowers-after.jpg",
  },
  "character-card": {
    sources: ["/agents/character-card-before.jpg", "/agents/character-card-profile.jpg", "/agents/character-card-full-body.jpg"],
    result: "/agents/character-card-after.jpg",
    sourceClassNames: ["object-cover", "object-cover", "object-cover"],
  },
};

for (const id of LOCATION_AGENT_IDS) {
  MULTI_GUIDES[id] = {
    sources: ["/agents/location-guide-front.jpg", "/agents/location-guide-left.jpg", "/agents/location-guide-right.jpg"],
    result: `/agents/${id}-after.jpg`,
    sourceCaption: "good",
  };
}

const CLOTHES_RATED_GUIDE: ImageAgentRatedGuide = {
  good: ["/agents/clothes-guide-full.jpg", "/agents/clothes-guide-knees.jpg"],
  bad: "/agents/clothes-guide-waist.jpg",
};

const RATED_GUIDES: Record<string, ImageAgentRatedGuide> = Object.fromEntries(
  CLOTHES_AGENT_IDS.map((id) => [id, CLOTHES_RATED_GUIDE]),
);

for (const agent of [...PHOTO_POSE_AGENTS, ...SCENE_PHOTO_AGENTS]) {
  RATED_GUIDES[agent.id] = {
    good: [`/agents/${agent.id}-before.jpg`],
    bad: `/agents/${agent.id}-bad.jpg`,
    uploadFromGuide: true,
    objectFit: "contain",
  };
}

const GTA_ONE_PHOTO_NOTICE: Record<string, string> = {
  ru: "Для этого агента требуется только одно фото.",
  en: "This agent requires only one photo.",
  zh: "此智能体只需要一张照片。",
  hi: "इस एजेंट को केवल एक फ़ोटो चाहिए।",
  es: "Este agente solo necesita una foto.",
  fr: "Cet agent ne nécessite qu’une seule photo.",
  ar: "يتطلب هذا الوكيل صورة واحدة فقط.",
  pt: "Este agente precisa de apenas uma foto.",
  de: "Dieser Agent benötigt nur ein Foto.",
  ja: "このエージェントに必要な写真は1枚だけです。",
  it: "Questo agente richiede una sola foto.",
  ko: "이 에이전트에는 사진 한 장만 필요합니다.",
  tr: "Bu ajan yalnızca bir fotoğraf gerektirir.",
  pl: "Ten agent wymaga tylko jednego zdjęcia.",
  nl: "Deze agent heeft slechts één foto nodig.",
  sv: "Den här agenten kräver bara ett foto.",
  cs: "Tento agent vyžaduje pouze jednu fotografii.",
  el: "Αυτός ο πράκτορας χρειάζεται μόνο μία φωτογραφία.",
  ro: "Acest agent necesită o singură fotografie.",
};

export function imageAgentMultiGuide(id: string): ImageAgentMultiGuide | null {
  return MULTI_GUIDES[id] ?? null;
}

export function imageAgentSlotHint(id: string, index: number, locale: string): string | null {
  if (id === "character-card" && index >= 0 && index < 3) {
    const hints: Record<string, string[]> = {
      ru: ["лицо крупно, анфас", "лицо сбоку", "человек в полный рост"],
      en: ["face close-up, straight on", "face from the side", "full body visible"],
    };
    return (hints[locale] ?? hints.en)[index];
  }
  if (id !== "face-swap" || (index !== 0 && index !== 1)) return null;
  return (FACE_SWAP_HINTS[locale] ?? FACE_SWAP_HINTS.en)[index];
}

export function imageAgentRatedGuide(id: string): ImageAgentRatedGuide | null {
  return RATED_GUIDES[id] ?? null;
}

export function imageAgentGuideNotice(id: string, locale: string): string | null {
  if (id === "gta-filter") return GTA_ONE_PHOTO_NOTICE[locale] ?? GTA_ONE_PHOTO_NOTICE.en;
  const expansion = imageAgentExpansion(id);
  if (!expansion) return null;
  if (locale === "ru") {
    if (expansion.group === "scene") return "Загрузите одно фото человека или одну готовую карточку персонажа.";
    if (expansion.framing === "full-body") return "Нужно одно фото в полный рост или одна карточка персонажа. Фото только лица не подойдёт.";
    if (expansion.framing === "knees-up") return "Нужно одно фото минимум до колен или одна карточка персонажа. Фото только лица не подойдёт.";
    return "Нужно одно фото минимум по грудь или одна карточка персонажа.";
  }
  if (expansion.group === "scene") return "Upload one person photo or one completed character card.";
  if (expansion.framing === "full-body") return "Upload one full-body photo or one character card. A face-only photo will not work.";
  if (expansion.framing === "knees-up") return "Upload one photo showing at least the knees, or one character card. A face-only photo will not work.";
  return "Upload one photo showing at least the chest, or one character card.";
}

export function imageAgentHidesGuideUpload(id: string): boolean {
  return id in MULTI_GUIDES || id in RATED_GUIDES;
}
