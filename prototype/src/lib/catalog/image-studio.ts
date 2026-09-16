const PHOTO_REF_MAX = 4;

const PHOTO_SLOT_LABEL: Record<string, (n: number) => string> = {
  ru: (n) => `Фото ${n}`,
  en: (n) => `Photo ${n}`,
  hi: (n) => `फ़ोटो ${n}`,
  es: (n) => `Foto ${n}`,
  fr: (n) => `Photo ${n}`,
  ar: (n) => `صورة ${n}`,
  pt: (n) => `Foto ${n}`,
  de: (n) => `Foto ${n}`,
  it: (n) => `Foto ${n}`,
  tr: (n) => `Fotoğraf ${n}`,
  pl: (n) => `Zdjęcie ${n}`,
  sv: (n) => `Foto ${n}`,
  cs: (n) => `Foto ${n}`,
};

export function photoReferenceCap(maxReferences: number | undefined, supported: boolean): number {
  if (!supported) return 0;
  if (typeof maxReferences !== "number" || !Number.isFinite(maxReferences)) return 1;
  return Math.min(PHOTO_REF_MAX, Math.max(0, Math.floor(maxReferences)));
}

export function photoSlotCount(input: {
  photoMode: "t2i" | "i2i";
  modelCap: number;
  agentMax?: number;
  template?: boolean;
}): number {
  if (input.photoMode !== "i2i" || input.modelCap < 1) return 0;
  const agentMax = input.agentMax ?? (input.template ? 1 : input.modelCap);
  return Math.min(PHOTO_REF_MAX, input.modelCap, Math.max(1, agentMax));
}

export function photoRequiredCount(input: {
  photoMode: "t2i" | "i2i";
  agentMin?: number;
  template?: boolean;
}): number {
  if (input.photoMode !== "i2i") return 0;
  const min = input.agentMin ?? (input.template ? 1 : 1);
  return Math.max(1, min);
}

export function photoRequiredSlotsFilled(items: Array<{ dataUrl?: string } | null | undefined>, required: number): boolean {
  if (required < 1) return true;
  return Array.from({ length: required }, (_, index) => items[index]).every((item) => Boolean(item?.dataUrl));
}

export function photoSlotLabel(locale: string, index: number): string {
  const n = index + 1;
  return (PHOTO_SLOT_LABEL[locale] ?? PHOTO_SLOT_LABEL.en)(n);
}

export function compatibleImageSizeForFormat(input: {
  sizes: string[];
  formatsBySize?: Record<string, string[]> | null;
  currentSize: string;
  format: string;
}): string {
  const { sizes, formatsBySize, currentSize, format } = input;
  if (!formatsBySize || (formatsBySize[currentSize] ?? []).includes(format)) return currentSize;
  return sizes.find((size) => (formatsBySize[size] ?? []).includes(format)) ?? currentSize;
}
