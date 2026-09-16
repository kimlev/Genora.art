"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type MenuProps = {
  /** Содержимое кнопки-триггера */
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
};

type MenuCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const VIEWPORT_MARGIN = 8;
const MIN_PANEL_WIDTH = 220;

function getViewportBox() {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

/**
 * Выпадающее меню: панель в portal на document.body, чтобы её не обрезал overflow
 * родителя. Координаты всегда физические (left/top) и прижимаются к видимой области.
 */
export function Menu({
  trigger,
  children,
  align = "start",
  triggerClassName,
  panelClassName,
  ariaLabel,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const triggerBox = containerRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!triggerBox || !panel) return;

    const view = getViewportBox();
    const maxWidth = Math.max(160, view.width - VIEWPORT_MARGIN * 2);
    const preferredWidth = Math.max(panel.scrollWidth, panel.offsetWidth, MIN_PANEL_WIDTH);
    const width = Math.min(preferredWidth, maxWidth);

    let left = align === "end" ? triggerBox.right - width : triggerBox.left;
    const minLeft = view.left + VIEWPORT_MARGIN;
    const maxLeft = view.left + view.width - width - VIEWPORT_MARGIN;
    left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));

    const maxHeight = Math.max(160, view.height - VIEWPORT_MARGIN * 2);
    const height = Math.min(panel.offsetHeight || 320, maxHeight);
    let top = triggerBox.bottom + 8;
    if (top + height > view.top + view.height - VIEWPORT_MARGIN) {
      top = triggerBox.top - height - 8;
    }
    top = Math.min(
      Math.max(top, view.top + VIEWPORT_MARGIN),
      view.top + view.height - height - VIEWPORT_MARGIN,
    );

    setCoords((previous) => (
      previous
      && previous.top === top
      && previous.left === left
      && previous.width === width
      && previous.maxHeight === maxHeight
        ? previous
        : { top, left, width, maxHeight }
    ));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => updatePosition());
    observer.observe(panel);
    return () => observer.disconnect();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    window.visualViewport?.addEventListener("resize", onReposition);
    window.visualViewport?.addEventListener("scroll", onReposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      window.visualViewport?.removeEventListener("resize", onReposition);
      window.visualViewport?.removeEventListener("scroll", onReposition);
    };
  }, [open, updatePosition]);

  const pageDir = typeof document === "undefined" ? "ltr" : document.documentElement.dir || "ltr";
  const panel = open ? (
    <motion.div
      ref={panelRef}
      id={panelId}
      role="menu"
      dir={pageDir}
      data-lenis-prevent
      onWheel={(event) => event.stopPropagation()}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      style={{
        top: 0,
        left: 0,
        right: "auto",
        width: coords?.width,
        maxHeight: coords?.maxHeight,
        transform: coords
          ? `translate3d(${coords.left}px, ${coords.top}px, 0)`
          : "translate3d(-9999px, 0, 0)",
      }}
      className={cn(
        "fixed z-[120] min-w-[220px] overflow-y-auto overflow-x-visible overscroll-contain rounded-2xl border border-border bg-surface p-1.5 shadow-[0_24px_60px_-24px_rgba(15,40,80,0.35)]",
        panelClassName,
      )}
    >
      {children(() => setOpen(false))}
    </motion.div>
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>{panel}</AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-1 text-start text-[11px] font-semibold uppercase tracking-[0.12em] text-steel">
      {children}
    </p>
  );
}

type MenuItemProps = {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
};

export function MenuItem({
  children,
  onClick,
  active,
  className,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-start text-sm transition-colors",
        active
          ? "bg-mist font-medium text-text"
          : "text-text hover:bg-mist/70",
        className,
      )}
    >
      {children}
    </button>
  );
}
