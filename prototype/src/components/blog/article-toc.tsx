"use client";

import Link from "next/link";

type ArticleTocItem = {
  id: string;
  title: string;
};

type ArticleTocProps = {
  label: string;
  title: string;
  items: ArticleTocItem[];
};

export function ArticleToc({ label, title, items }: ArticleTocProps) {
  if (!items.length) return null;

  return (
    <aside className="order-2 min-w-0 lg:order-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)]">
      <nav
        aria-label={label}
        data-lenis-prevent
        className="max-h-[min(32rem,calc(100dvh-7rem))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-4 lg:max-h-[calc(100dvh-7rem)]"
        onWheel={(event) => event.stopPropagation()}
      >
        <p className="mb-3 text-sm font-semibold text-text">{title}</p>
        <ul className="space-y-1">
          {items.map((section) => (
            <li key={section.id}>
              <Link href={`#${section.id}`} className="block rounded-lg px-3 py-2 text-sm leading-snug text-steel transition-colors hover:bg-mist hover:text-text">
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
