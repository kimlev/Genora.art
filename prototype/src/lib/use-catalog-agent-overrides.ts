"use client";

import { subscribeCatalogAgentOverrides } from "@/lib/catalog-agent-overrides";
import { useEffect, useState } from "react";

export function useCatalogAgentOverrides() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeCatalogAgentOverrides(() => setVersion((current) => current + 1)), []);
  return version;
}
