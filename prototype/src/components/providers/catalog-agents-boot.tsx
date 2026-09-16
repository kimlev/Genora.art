"use client";

import { CATALOG_AGENTS_CHANGED, setCatalogAgentOverrides, type CatalogAgentOverride } from "@/lib/catalog-agent-overrides";
import { useEffect } from "react";

export function CatalogAgentsBoot() {
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/agents/catalog", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json().catch(() => null) as { items?: CatalogAgentOverride[] } | null;
      if (!cancelled && data?.items) setCatalogAgentOverrides(data.items);
    };
    void load();
    const onChange = () => { void load(); };
    window.addEventListener(CATALOG_AGENTS_CHANGED, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CATALOG_AGENTS_CHANGED, onChange);
    };
  }, []);
  return null;
}
