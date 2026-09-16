import { automaticDepth, type RoutedDepth } from "@/lib/auto-depth";
import type { Locale } from "@/lib/locale-from-request";

export type ChatRouteCandidate = {
  id: string;
  providerId: string;
  score: number;
  inputPrice: number;
  outputPrice: number;
  latencyMs: number;
  supportsReasoning: boolean;
};

export function requestedChatDepth(
  prompt: string,
  depth: "auto" | RoutedDepth,
  locale?: Locale | null,
): RoutedDepth {
  return depth === "auto"
    ? automaticDepth(prompt, { supportsReasoning: true, locale })
    : depth;
}

function scale(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  if (maximum <= minimum) return 1;
  return Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
}

function median(values: number[], fallback: number): number {
  if (!values.length) return fallback;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

/**
 * Запрос определяет баланс качества, цены и скорости. Модель остаётся кандидатом
 * даже при временно неполной метрике: пропуск получает медианное значение пула.
 */
export function rankChatRoutes(
  candidates: ChatRouteCandidate[],
  depth: RoutedDepth,
): Array<ChatRouteCandidate & { rank: number }> {
  if (!candidates.length) return [];
  const positivePrices = candidates
    .map((candidate) => (candidate.inputPrice + candidate.outputPrice) / 2)
    .filter((price) => Number.isFinite(price) && price > 0);
  const knownLatencies = candidates
    .map((candidate) => candidate.latencyMs)
    .filter((latency) => Number.isFinite(latency) && latency > 0);
  const typicalPrice = median(positivePrices, 1);
  const typicalLatency = median(knownLatencies, 15_000);
  const prepared = candidates.map((candidate) => ({
    candidate,
    price: (candidate.inputPrice + candidate.outputPrice) / 2 > 0
      ? (candidate.inputPrice + candidate.outputPrice) / 2
      : typicalPrice,
    latency: candidate.latencyMs > 0 ? candidate.latencyMs : typicalLatency,
  }));
  const scores = prepared.map(({ candidate }) => Number(candidate.score) || 0);
  const prices = prepared.map(({ price }) => Math.log1p(price));
  const latencies = prepared.map(({ latency }) => latency);
  const scoreMin = Math.min(...scores);
  const scoreMax = Math.max(...scores);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const latencyMin = Math.min(...latencies);
  const latencyMax = Math.max(...latencies);
  const weights = depth === "deep"
    ? { quality: 0.60, cost: 0.15, speed: 0.05, reasoning: 0.20 }
    : depth === "balanced"
      ? { quality: 0.45, cost: 0.30, speed: 0.20, reasoning: 0.05 }
      : { quality: 0.20, cost: 0.35, speed: 0.45, reasoning: 0 };

  return prepared
    .map(({ candidate, price, latency }) => ({
      ...candidate,
      rank: scale(candidate.score, scoreMin, scoreMax) * weights.quality
        + (1 - scale(Math.log1p(price), priceMin, priceMax)) * weights.cost
        + (1 - scale(latency, latencyMin, latencyMax)) * weights.speed
        + (candidate.supportsReasoning ? 1 : 0) * weights.reasoning,
    }))
    .sort((left, right) => right.rank - left.rank || right.score - left.score || left.id.localeCompare(right.id));
}
