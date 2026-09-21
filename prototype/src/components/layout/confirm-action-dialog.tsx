"use client";

import { Button } from "@/components/ui/button";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { acquireScrollLock } from "@/lib/scroll-lock";

export function ConfirmActionDialog({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    return acquireScrollLock();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-[26px] border border-border bg-surface p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {message ? <p className="mt-3 text-sm leading-relaxed text-steel">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" className="border-rose-200/80 bg-rose-200 text-rose-800 shadow-none hover:bg-rose-400 hover:text-rose-950" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
