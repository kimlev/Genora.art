"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Check, UserRound, X } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import type { CharacterSummary } from "@/lib/characters";
import { characterUiCopy } from "@/lib/i18n/copy/characters";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { acquireScrollLock } from "@/lib/scroll-lock";

const CHARACTER_LABELS: Record<Locale, string> = {
  ru: "Персонаж",
  en: "Character",
  zh: "角色",
  hi: "पात्र",
  es: "Personaje",
  fr: "Personnage",
  ar: "شخصية",
  pt: "Personagem",
  de: "Charakter",
  ja: "キャラクター",
  it: "Personaggio",
  ko: "캐릭터",
  tr: "Karakter",
  pl: "Postać",
  nl: "Personage",
  sv: "Karaktär",
  cs: "Postava",
  el: "Χαρακτήρας",
  ro: "Personaj",
};

export function characterPickerLabel(locale: Locale): string {
  return CHARACTER_LABELS[locale];
}

export function CharacterPickerDialog({ locale, characters, selectedId, open, onClose, onChange }: {
  locale: Locale;
  characters: CharacterSummary[];
  selectedId: string;
  open: boolean;
  onClose: () => void;
  onChange: (id: string) => void;
}) {
  const copy = characterUiCopy(locale);
  const readyCharacters = characters.filter((item) => item.status === "ready");
  useEffect(() => {
    if (!open) return;
    const releaseScrollLock = acquireScrollLock();
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      releaseScrollLock();
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onClose, open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[500] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="character-picker-title" onClick={onClose}>
      <div className="flex max-h-[min(82dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 id="character-picker-title" className="text-lg font-semibold text-text">{copy.title}</h3>
          <button type="button" aria-label={copy.cancel} onClick={onClose} className="grid size-9 place-items-center rounded-full border border-border text-steel hover:bg-mist hover:text-text"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {readyCharacters.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {readyCharacters.map((character) => {
                const selected = character.id === selectedId;
                return (
                  <button
                    key={character.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { onChange(character.id); onClose(); }}
                    className={cn("overflow-hidden rounded-2xl border bg-bg text-left transition hover:border-accent-brand", selected ? "border-accent-brand ring-2 ring-accent-brand/20" : "border-border")}
                  >
                    <span className="relative block aspect-square bg-mist">
                      {character.previewUrl ? <Image src={character.previewUrl} alt={character.name} fill unoptimized className="object-cover" /> : <UserRound className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-steel" />}
                      {selected ? <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent-brand text-white"><Check className="size-4" /></span> : null}
                    </span>
                    <span className="block truncate px-3 py-2 text-sm font-semibold text-text">{character.name}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="py-10 text-center text-sm text-steel">{copy.noReady}</p>}
        </div>
        <div className="border-t border-border p-4">
          <Link href="/profile/characters?create=1" onClick={onClose} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-brand px-4 text-sm font-semibold text-white hover:brightness-105"><UserRound className="size-4" />{copy.create}</Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
