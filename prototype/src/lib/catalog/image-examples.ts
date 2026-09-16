import data from "./image-examples-data.json";

export type ImageExampleStyle =
  | "auto"
  | "photorealistic"
  | "illustration"
  | "cartoon"
  | "cinematic"
  | "minimal"
  | "three_d";

export type ImageExampleModel = {
  id: string;
  label: string;
  provider: string;
  provider_label?: string;
  billed_average_tokens?: number;
  average_request_cost_usd?: number;
};

export type ImageExample = {
  slot: number;
  id: string;
  provider: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  style: ImageExampleStyle;
  format: string;
  size: string;
  reasoning: string | null;
  image: string;
  prompt: string;
  span?: string;
};

type ExampleRecord = (typeof data)[number];

function promptForLocale(record: ExampleRecord, locale: string): string {
  const prompts = record.prompt as Record<string, string>;
  return prompts[locale] || prompts.ru;
}

export function imageExampleThumb(image: string): string {
  return image.replace("/image-examples/", "/image-examples/thumbs/").replace(/\.jpg$/i, ".webp");
}

export function imageExamplesForModels(_models: ImageExampleModel[] = [], locale = "ru"): ImageExample[] {
  return data.map((record) => ({
    slot: record.slot,
    id: record.id,
    provider: record.provider,
    providerLabel: record.providerLabel,
    modelId: record.modelId,
    modelLabel: record.modelLabel,
    style: record.style as ImageExampleStyle,
    format: record.format,
    size: record.size,
    reasoning: record.reasoning,
    image: record.image,
    prompt: promptForLocale(record, locale),
    span: record.span,
  }));
}

export const IMAGE_EXAMPLE_PROVIDERS = [...new Set(data.map((record) => record.providerLabel))];
export const IMAGE_EXAMPLE_PRELOADS = data.slice(0, 2).map((record) => imageExampleThumb(record.image));
