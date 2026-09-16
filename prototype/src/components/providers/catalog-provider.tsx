"use client";

import { commercialModels, type CommercialModel } from "@/lib/catalog/commercial-models";
import { isImageCatalogModel, isMusicCatalogModel, isVideoCatalogModel } from "@/lib/catalog/model-kind";
import { getCommercialModelMetrics } from "@/lib/model-metrics";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CatalogModel = CommercialModel & {
  score: number;
  votes: number;
  capabilities?: { kind?: string; reasoning?: unknown; averageRequestCostUsd?: number | null } | null;
  averageRequestCostUsd?: number | null;
  billingMultiplier?: number;
  tokensUsed?: number;
};
type CatalogContextValue = {
  models: CatalogModel[];
  providers: Array<{ id: string; name: string }>;
  syncedAt: string | null;
  refresh: () => Promise<void>;
};

const fallbackModels = commercialModels.map((model) => ({ ...model, ...getCommercialModelMetrics(model) }));
const fallbackProviders = [...new Set(commercialModels.map((model) => model.provider))].map((name) => ({ id: name.toLowerCase(), name }));
const CatalogContext = createContext<CatalogContextValue>({ models: fallbackModels, providers: fallbackProviders, syncedAt: null, refresh: async () => undefined });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<CatalogModel[]>(fallbackModels);
  const [providers, setProviders] = useState(fallbackProviders);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/catalog");
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
    const data = await response.json().catch(() => null) as { models?: CatalogModel[]; providers?: Array<{ id: string; name: string }>; syncedAt?: string } | null;
    if (!data) return;
    if (data.models?.length) {
      const textModels = data.models.filter((model) => !isImageCatalogModel(model) && !isMusicCatalogModel(model) && !isVideoCatalogModel(model));
      setModels(textModels);
      const textProviderNames = new Set(textModels.map((model) => model.provider));
      setProviders((data.providers ?? []).filter((provider) => textProviderNames.has(provider.name)));
    } else if (data.providers?.length) {
      setProviders(data.providers);
    }
    setSyncedAt(data.syncedAt ?? null);
  }, []);
  useEffect(() => {
    const initial=window.setTimeout(() => void refresh(),0);
    const update = () => { window.setTimeout(() => void refresh(), 120); };
    window.addEventListener("genora-feedback-change", update);
    return () => {window.clearTimeout(initial);window.removeEventListener("genora-feedback-change", update);};
  }, [refresh]);
  const value = useMemo(() => ({ models, providers, syncedAt, refresh }), [models, providers, refresh, syncedAt]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  return useContext(CatalogContext);
}
