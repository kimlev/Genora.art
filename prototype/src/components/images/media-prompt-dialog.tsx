"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { mediaTitleCopy } from "@/lib/i18n/copy/media-title";
import { normalizeMediaTitle, MEDIA_TITLE_MAX } from "@/lib/media-title";

export function MediaPromptDialog({ locale, prompt, title, closeLabel, onClose, onSave, copyButton }: {
  locale: string; prompt: string; title: string; closeLabel: string;
  onClose: () => void; onSave?: (title: string) => Promise<void>; copyButton: React.ReactNode;
}) {
  const copy = mediaTitleCopy(locale);
  const [draft, setDraft] = useState(title);
  const [saved, setSaved] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const normalized = normalizeMediaTitle(draft);
  const save = async () => {
    if (!onSave || busy || normalized === null) return;
    setBusy(true);
    setError(false);
    try { await onSave(normalized); setSaved(normalized); setDraft(normalized); }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
    const first = items?.[0];
    const last = items?.[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return (
    <div ref={panel} onKeyDown={trapFocus} className="flex max-h-[80dvh] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="shrink-0 border-b border-border bg-mist/50 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="media-title-input" className="text-base font-bold text-accent-brand">{copy.title}</label>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="grid size-9 place-items-center rounded-full border border-border hover:bg-mist"><X className="size-4" /></button>
        </div>
        {onSave ? <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex gap-2">
            <input id="media-title-input" autoFocus value={draft} disabled={busy} aria-describedby="media-title-hint" aria-invalid={normalized === null}
              onChange={(event) => setDraft(Array.from(event.target.value).slice(0, MEDIA_TITLE_MAX).join(""))}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text" />
            <button type="submit" disabled={busy || normalized === null || normalized === saved} className="rounded-xl bg-accent-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{copy.save}</button>
          </div>
          <p id="media-title-hint" className="mt-2 text-xs text-steel">{copy.hint} <span className="tabular-nums">{Array.from(draft).length}/30</span></p>
          {error ? <p className="mt-2 text-sm text-destructive" role="alert">{copy.failed}</p> : null}
        </form> : <p className="break-words text-sm font-medium text-text">{title || "—"}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
        <h3 id="media-prompt-heading" className="text-base font-bold text-accent-brand">{copy.prompt}</h3>
        {copyButton}
      </div>
      <div tabIndex={0} aria-labelledby="media-prompt-heading" className="min-h-0 overflow-y-auto overscroll-contain p-5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{prompt || "—"}</p>
      </div>
    </div>
  );
}
