"use client";

import { isAgentCategory } from "@/lib/agent-context";
import type { AgentCategory } from "@/lib/mock/agent-types";
import { useCallback, useEffect, useState } from "react";

export type CustomAgent = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  modelId: string;
  category: "custom";
  context: AgentCategory;
};

const STORAGE_KEY = "genora-custom-agents";
const CHANGE_EVENT = "genora-custom-agents-change";

function normalizeAgent(value: Partial<CustomAgent> & { id: string; name: string }): CustomAgent {
  return {
    id: value.id,
    name: value.name,
    description: value.description ?? "",
    systemPrompt: value.systemPrompt ?? "",
    icon: value.icon ?? "bot",
    modelId: value.modelId ?? "gpt-5.6-sol",
    category: "custom",
    context: isAgentCategory(value.context) ? value.context : "writing",
  };
}

function readAgents(): CustomAgent[] {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Partial<CustomAgent>[]).map((item) => normalizeAgent({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      description: item.description,
      systemPrompt: item.systemPrompt,
      icon: item.icon,
      modelId: item.modelId,
      context: item.context,
    })).filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

function writeAgents(agents: CustomAgent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCustomAgents() {
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);

  useEffect(() => {
    const sync = () => setCustomAgents(readAgents());
    sync();
    void fetch("/api/agents", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { agents?: CustomAgent[] };
      if (data.agents) writeAgents(data.agents.map((item) => normalizeAgent(item)));
    }).catch(() => undefined);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const saveCustomAgent = useCallback((agent: Omit<CustomAgent, "id" | "category"> & { id?: string }) => {
    const current = readAgents();
    const id = agent.id ?? `custom-${Date.now()}`;
    const next = normalizeAgent({ ...agent, id, category: "custom" });
    writeAgents(current.some((item) => item.id === id) ? current.map((item) => item.id === id ? next : item) : [next, ...current]);
    void fetch("/api/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => undefined);
    return next;
  }, []);

  const deleteCustomAgent = useCallback((id: string) => {
    writeAgents(readAgents().filter((item) => item.id !== id));
    void fetch(`/api/agents?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
  }, []);

  return { customAgents, saveCustomAgent, deleteCustomAgent };
}
