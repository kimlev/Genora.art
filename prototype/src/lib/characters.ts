export const CHARACTER_AGENT_ID = "character-card";
export const AI_CHARACTER_AGENT_ID = "ai-character-card";
export const CHARACTER_LIMIT = 1;
export const CHARACTER_SOURCE_COUNT = 3;
export const CHARACTER_NAME_MIN = 3;
export const CHARACTER_NAME_MAX = 25;
export const CHARACTER_DESCRIPTION_MIN = 10;
export const CHARACTER_DESCRIPTION_MAX = 2000;

export type CharacterKind = "personal" | "ai";

export type CharacterStatus = "creating" | "ready" | "failed";

export type CharacterSummary = {
  id: string;
  kind: CharacterKind;
  name: string;
  status: CharacterStatus;
  previewUrl: string | null;
  assetId: string | null;
  assetUrl: string | null;
  sourcePreviewUrls: string[];
  modelId: string | null;
  modelLabel: string | null;
  size: string | null;
  format: string | null;
  createdAt: string;
};

export type CharacterListPayload = {
  characters: CharacterSummary[];
  limit: number;
  freeRemaining: number;
  nextBuildTokens: number | null;
};

export function validCharacterName(value: string): boolean {
  const length = [...value.trim()].length;
  return length >= CHARACTER_NAME_MIN && length <= CHARACTER_NAME_MAX;
}

export function canCreateCharacter(name: string, photos: Array<unknown | null>, consent: boolean): boolean {
  return consent && validCharacterName(name) && photos.length === CHARACTER_SOURCE_COUNT && photos.every(Boolean);
}

export function validCharacterDescription(value: string): boolean {
  const length = [...value.trim()].length;
  return length >= CHARACTER_DESCRIPTION_MIN && length <= CHARACTER_DESCRIPTION_MAX;
}

export function canCreateAiCharacter(name: string, description: string): boolean {
  return validCharacterName(name) && validCharacterDescription(description);
}
