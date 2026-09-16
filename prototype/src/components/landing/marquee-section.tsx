"use client";

import { useT } from "@/components/providers/locale-provider";
import { useCatalog } from "@/components/providers/catalog-provider";
import { ProviderLogo } from "@/components/chat/provider-logo";
import { Link } from "@/components/ui/locale-link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

type TrackItem = { id: string; name: string; provider: string };

function seededWeight(value: string): number {
  return [...value].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 7), 0);
}

/** Каждая модель каталога попадает в дорожку ровно один раз, провайдеры чередуются по кругу */
function buildInterleavedTrack(models: TrackItem[], providerOrder: string[]): TrackItem[] {
  const order = [...new Set([...providerOrder, ...models.map((model) => model.provider)])];
  const groups = order
    .map((provider) =>
      models
        .filter((model) => model.provider === provider)
        .sort((left, right) => seededWeight(left.id) - seededWeight(right.id)),
    )
    .filter((group) => group.length);
  if (!groups.length) return [];

  const rounds = Math.max(...groups.map((group) => group.length));
  return Array.from({ length: rounds }).flatMap((_, round) =>
    groups.map((group) => group[round]).filter((item): item is TrackItem => Boolean(item)),
  );
}

/**
 * Модели изображений живут не в текстовом каталоге, а в ответе интегратора,
 * поэтому запрашиваем их отдельно. Недоступный каталог просто не добавляет плашек.
 */
function useImageModels(): TrackItem[] {
  const [items, setItems] = useState<TrackItem[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void fetch("/api/images/catalog")
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { models?: Array<{ id: string; label: string; provider: string; provider_label: string }> } | null) => {
          if (!active || !payload?.models?.length) return;
          setItems(payload.models.slice(0, 12).map((model) => ({
            id: `image:${model.provider}:${model.id}`,
            name: model.label,
            provider: model.provider_label,
          })));
        })
        .catch(() => undefined);
    };
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load);
    } else {
      timeoutId = window.setTimeout(load, 800);
    }
    return () => {
      active = false;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);
  return items;
}

export function MarqueeSection() {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const { models, providers } = useCatalog();
  const imageModels = useImageModels();
  const track = useMemo(
    () =>
      buildInterleavedTrack(
        [
          ...models.slice(0, 18).map((model) => ({ id: model.id, name: model.name, provider: model.provider })),
          ...imageModels,
        ],
        providers.map((provider) => provider.name),
      ),
    [imageModels, models, providers],
  );
  // Лента нарочно медленная: чем больше моделей, тем длиннее круг
  const duration = Math.max(64, track.length * 2.6);

  return (
    <section className="border-y border-border bg-mist/60 py-8 sm:py-10">
      <Link href="/models" className="block rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-steel underline-offset-8 transition-colors group-hover:text-text [text-decoration-color:var(--accent)] hover:underline">
          {t.marquee.label}
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent sm:w-24" />

        <motion.div
          className="flex w-max gap-3"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration,
                  repeat: Infinity,
                  ease: "linear",
                }
          }
        >
          {[...track, ...track].map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface py-2 pl-2 pr-3.5 text-sm font-medium text-text"
            >
              <ProviderLogo provider={item.provider} className="size-5" />
              {item.name}
            </span>
          ))}
        </motion.div>
      </div>
      </Link>
    </section>
  );
}
