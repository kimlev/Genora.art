import type { LucideIcon } from "lucide-react";

const TILES = [
  {
    surface: "border-[#f3c19a] bg-[linear-gradient(180deg,#fff3e8_0%,#fff8f2_72%,#ffffff_100%)]",
    blob: "bg-[#e86b2c]/18",
    iconWrap: "bg-[#e86b2c] text-white shadow-[0_8px_16px_-8px_rgba(232,107,44,0.75)]",
    title: "text-[#c24e16]",
    hover: "hover:border-[#e86b2c] hover:shadow-[0_22px_48px_-24px_rgba(232,107,44,0.42)]",
  },
  {
    surface: "border-[#9ec9ff] bg-[linear-gradient(180deg,#eef6ff_0%,#f7fbff_72%,#ffffff_100%)]",
    blob: "bg-[#FF6F00]/20",
    iconWrap: "bg-[#FF6F00] text-white shadow-[0_8px_16px_-8px_rgba(74,158,255,0.85)]",
    title: "text-[#1d6fd4]",
    hover: "hover:border-[#FF6F00] hover:shadow-[0_22px_48px_-24px_rgba(30,112,255,0.5)]",
  },
  {
    surface: "border-[#8ed4bb] bg-[linear-gradient(180deg,#e8faf3_0%,#f3fcf8_72%,#ffffff_100%)]",
    blob: "bg-[#12a37a]/18",
    iconWrap: "bg-[#12a37a] text-white shadow-[0_8px_16px_-8px_rgba(18,163,122,0.7)]",
    title: "text-[#0d7a5b]",
    hover: "hover:border-[#12a37a] hover:shadow-[0_22px_48px_-24px_rgba(18,163,122,0.42)]",
  },
  {
    surface: "border-[#d4b3f0] bg-[linear-gradient(180deg,#f6edff_0%,#fbf7ff_72%,#ffffff_100%)]",
    blob: "bg-[#8b5cf6]/18",
    iconWrap: "bg-[#8b5cf6] text-white shadow-[0_8px_16px_-8px_rgba(139,92,246,0.7)]",
    title: "text-[#6d28d9]",
    hover: "hover:border-[#8b5cf6] hover:shadow-[0_22px_48px_-24px_rgba(139,92,246,0.42)]",
  },
] as const;

type LandingFeatureTilesProps = {
  items: Array<{ title: string; text: string }>;
  icons: LucideIcon[];
};

export function LandingFeatureTiles({ items, icons }: LandingFeatureTilesProps) {
  return (
    <div className="mt-5 grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2">
      {items.map((item, index) => {
        const Icon = icons[index] ?? icons[0];
        const tile = TILES[index % TILES.length];
        return (
          <article
            key={item.title}
            className={`group relative flex h-full min-h-[7.5rem] flex-col overflow-hidden rounded-2xl border p-3.5 transition-[border-color,box-shadow,transform] motion-safe:hover:-translate-y-0.5 ${tile.surface} ${tile.hover}`}
          >
            <span aria-hidden className={`pointer-events-none absolute -right-6 -top-8 size-20 rounded-full transition-transform duration-300 ease-out motion-safe:group-hover:scale-125 ${tile.blob}`} />
            <h3 className={`relative flex items-center gap-2 text-sm font-semibold ${tile.title}`}>
              <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${tile.iconWrap}`}>
                <Icon className="size-3.5" />
              </span>
              {item.title}
            </h3>
            <p className="relative mt-1.5 text-xs leading-relaxed text-steel">{item.text}</p>
          </article>
        );
      })}
    </div>
  );
}
