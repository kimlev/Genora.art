"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
};

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  className,
}: BeforeAfterSliderProps) {
  const labelId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [split, setSplit] = useState(52);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const moveTo = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    const next = ((clientX - box.left) / box.width) * 100;
    setSplit(Math.min(88, Math.max(12, next)));
  }, []);

  return (
    <div
      ref={frameRef}
      className={cn("absolute inset-0 select-none bg-mist", className)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        moveTo(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {active ? (
        <>
          <img src={afterSrc} alt={afterAlt} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" draggable={false} />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
            <img src={beforeSrc} alt={beforeAlt} className="size-full object-cover" loading="lazy" decoding="async" draggable={false} />
          </div>
        </>
      ) : null}
      <div className="absolute inset-y-0 w-px bg-white" style={{ left: `${split}%` }} />
      <div
        className="absolute top-1/2 left-0 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-text"
        style={{ left: `${split}%` }}
      >
        <span className="sr-only" id={labelId}>
          До и после
        </span>
        <span aria-hidden className="flex gap-0.5">
          <span className="h-3 w-px bg-[#111111]" />
          <span className="h-3 w-px bg-[#111111]" />
        </span>
      </div>
      <input
        type="range"
        min={12}
        max={88}
        value={split}
        aria-labelledby={labelId}
        className="sr-only"
        onChange={(event) => setSplit(Number(event.target.value))}
      />
    </div>
  );
}
