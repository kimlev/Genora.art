const IMAGE_PROVIDER_IDS = new Set(["flux", "ideogram"]);
const IMAGE_PROVIDER_NAMES = new Set(["ideogram", "black forest labs", "flux"]);

export function isImageCatalogModel(model: {
  id?: string;
  provider?: string;
  providerId?: string;
  capabilities?: { kind?: string } | null;
}): boolean {
  if (model.capabilities?.kind === "image") return true;
  if (model.providerId && IMAGE_PROVIDER_IDS.has(model.providerId)) return true;
  if (model.provider && IMAGE_PROVIDER_NAMES.has(model.provider.toLowerCase())) return true;
  return /(?:^|[.-])(?:image|imagine|flux\.|ideogram)/i.test(model.id ?? "");
}

export function isMusicCatalogModel(model: {
  id?: string;
  provider?: string;
  providerId?: string;
  capabilities?: { kind?: string } | null;
}): boolean {
  if (model.capabilities?.kind === "music") return true;
  if (model.id?.startsWith("music:")) return true;
  return /(?:lyria|mureka|music_v2|(?:^|[-:])(?:music|song)(?:[-:]|$))/i.test(model.id ?? "");
}

export function isVideoCatalogModel(model: {
  id?: string;
  capabilities?: { kind?: string } | null;
}): boolean {
  if (model.capabilities?.kind === "video") return true;
  if (model.id?.startsWith("video:")) return true;
  return /(?:veo|wan-|hailuo|seedance|kling|gen-4|flux-3-video|omni-1|(?:^|[-.])video(?:[-.]|$))/i.test(model.id ?? "");
}
