const PROVIDER_IDS: Record<string, string> = {
  openai: "openai",
  OpenAI: "openai",
  anthropic: "anthropic",
  Anthropic: "anthropic",
  google: "google",
  Google: "google",
  "Google Gemini": "google",
  GoogleGemini: "google",
  "Google Lyria": "google",
  GoogleLyria: "google",
  kimi: "kimi",
  Kimi: "kimi",
  "Kimi (Moonshot)": "kimi",
  xai: "xai",
  xAI: "xai",
  alibaba: "alibaba",
  Alibaba: "alibaba",
  "Alibaba Qwen": "alibaba",
  "Alibaba Cloud": "alibaba",
};

/** Display name from the picker ("Google Gemini") must become Integrator id ("google"). */
export function integratorProviderId(
  nameOrId: string | undefined,
  catalog: Array<{ id: string; name: string }> = [],
): string {
  const value = String(nameOrId ?? "").trim();
  if (!value) return "";
  const fromCatalog = catalog.find((provider) => provider.id === value || provider.name === value);
  if (fromCatalog) return fromCatalog.id;
  if (PROVIDER_IDS[value]) return PROVIDER_IDS[value];
  const compact = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (compact.startsWith("google")) return "google";
  if (compact.startsWith("kimi") || compact.includes("moonshot")) return "kimi";
  if (compact.startsWith("alibaba") || compact.startsWith("qwen")) return "alibaba";
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
