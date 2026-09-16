import { BadgeIcon, Bot, BrainCircuit, BriefcaseBusiness, Code2, CreditCard, Database, ImageIcon, Languages, Layers3, Megaphone, Palette, PenLine, ScanLine, Scissors, Search, ShieldCheck, Sparkles, UserRound, UsersRound, Video, WandSparkles, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  bot: Bot,
  brain: BrainCircuit,
  code: Code2,
  database: Database,
  pen: PenLine,
  search: Search,
  megaphone: Megaphone,
  languages: Languages,
  sparkles: Sparkles,
  badge: BadgeIcon,
  "credit-card": CreditCard,
  palette: Palette,
  scan: ScanLine,
  "user-round": UserRound,
  "users-round": UsersRound,
  layers: Layers3,
  wand: WandSparkles,
  shield: ShieldCheck,
  "briefcase-business": BriefcaseBusiness,
  image: ImageIcon,
  video: Video,
  scissors: Scissors,
};

export function AgentIcon({ icon, className = "size-4" }: { icon?: string; className?: string }) {
  const Icon = (icon && iconMap[icon]) || Bot;
  return <Icon className={className} />;
}
