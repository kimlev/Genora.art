"use client";

import { cn } from "@/lib/utils";
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type PinTilesProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
};

export function PinTiles({
  id = "pin",
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  ariaLabel,
}: PinTilesProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, index) => value[index] ?? "");

  const focusAt = (index: number) => {
    refs.current[Math.max(0, Math.min(3, index))]?.focus();
  };

  const write = (next: string, focusIndex?: number) => {
    const pin = next.replace(/\D/g, "").slice(0, 4);
    onChange(pin);
    if (typeof focusIndex === "number") focusAt(focusIndex);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pin = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    write(pin, pin.length >= 4 ? 3 : pin.length);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        write(next.join(""));
        return;
      }
      const previous = Math.max(0, index - 1);
      const next = [...digits];
      next[previous] = "";
      write(next.join(""), previous);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  return (
    <div className="flex gap-3" dir="ltr" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          key={`${id}-${index}`}
          ref={(node) => { refs.current[index] = node; }}
          id={index === 0 ? id : undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={ariaLabel ? `${ariaLabel} ${index + 1}` : undefined}
          value={digit}
          onPaste={onPaste}
          onKeyDown={(event) => onKeyDown(index, event)}
          onChange={(event) => {
            const nextDigit = event.target.value.replace(/\D/g, "").slice(-1);
            const next = [...digits];
            next[index] = nextDigit;
            write(next.join(""), nextDigit ? index + 1 : index);
          }}
          className={cn(
            "h-14 w-14 rounded-xl border border-input bg-surface text-center text-xl font-semibold tracking-[0.2em] text-text outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
