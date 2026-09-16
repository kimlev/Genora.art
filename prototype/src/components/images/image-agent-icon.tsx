import { BadgeIcon, BriefcaseBusiness, CreditCard, ImageIcon, Layers3, Palette, ScanLine, Scissors, ShieldCheck, UserRound, UsersRound, WandSparkles, type LucideIcon } from "lucide-react";

const agentIcons: Record<string, LucideIcon> = {
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
  scissors: Scissors,
};

export function ImageAgentIcon({ icon, className = "size-4" }: { icon: string; className?: string }) {
  const Icon = agentIcons[icon] ?? ImageIcon;
  return <Icon className={className} />;
}
