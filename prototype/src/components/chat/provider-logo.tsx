import Image from "next/image";
import { Network } from "lucide-react";

const providerIcons: Record<string, string> = {
  OpenAI: "/providers/openai.svg",
  Anthropic: "/providers/anthropic.svg",
  Kimi: "/providers/kimi.svg",
  Google: "/providers/google.svg",
  xAI: "/providers/xai.svg",
  Alibaba: "/providers/alibaba.svg",
  Ideogram: "/providers/ideogram.svg",
  DeepSeek: "/providers/deepseek.svg",
  Meta: "/providers/meta.svg",
  MiniMax: "/providers/minimax.svg",
  Sonilo: "/providers/sonilo.svg",
  sonilo: "/providers/sonilo.svg",
  "Black Forest Labs": "/providers/flux.svg",
  flux: "/providers/flux.svg",
  Flux: "/providers/flux.svg",
  "Google Gemini": "/providers/google.svg",
  GoogleGemini: "/providers/google.svg",
  "Google Lyria": "/providers/google.svg",
  "Alibaba Cloud": "/providers/alibaba.svg",
  "Alibaba Fun-Music": "/providers/alibaba.svg",
  Kling: "/providers/kling.svg",
  Runway: "/providers/runway.svg",
  ByteDance: "/providers/bytedance.svg",
  ElevenLabs: "/providers/elevenlabs.svg",
  Mureka: "/providers/mureka.svg",
  Suno: "/providers/suno.svg",
  Udio: "/providers/udio.svg",
  Stability: "/providers/stability.svg",
};

const providerAliases: Record<string, string> = {
  google: "Google",
  elevenlabs: "ElevenLabs",
  mureka: "Mureka",
  alibaba: "Alibaba",
  openai: "OpenAI",
  sonilo: "Sonilo",
  minimax: "MiniMax",
};

export function ProviderLogo({ provider, className = "size-4" }: { provider: string; className?: string }) {
  const icon = providerIcons[provider] || providerIcons[providerAliases[provider.toLowerCase()] ?? ""];
  return (
    <span className={`grid shrink-0 place-items-center rounded-md bg-white p-1 shadow-sm ${className}`} aria-hidden="true">
      {icon ? <Image src={icon} alt="" width={16} height={16} className="size-full object-contain" /> : <Network className="size-full text-slate-600" />}
    </span>
  );
}
