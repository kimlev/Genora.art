"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/providers/locale-provider";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

const TITLE_LIMIT = 40;

export function RenameTitleDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initial.slice(0, TITLE_LIMIT));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = value.trim();
    if (!title) return;
    onSave(title.slice(0, TITLE_LIMIT));
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={t.workspace.renameTitle}>
      <form onSubmit={submit} className="w-full max-w-md rounded-[26px] border border-border bg-surface p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-text">{t.workspace.renameTitle}</h2>
        <div className="relative mt-4">
          <Input
            autoFocus
            dir="auto"
            maxLength={TITLE_LIMIT}
            value={value}
            onChange={(event) => setValue(event.target.value.slice(0, TITLE_LIMIT))}
            className="h-11 pe-14"
          />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-steel">
            {value.length}/{TITLE_LIMIT}
          </span>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>{t.workspace.renameCancel}</Button>
          <Button type="submit" disabled={!value.trim()}>{t.workspace.renameSave}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
