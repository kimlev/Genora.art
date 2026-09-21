type ScrollStyles = {
  htmlOverflow: string;
  bodyOverflow: string;
};

const activeLocks = new Set<symbol>();
let previousStyles: ScrollStyles | null = null;

function restorePreviousStyles() {
  if (!previousStyles) return;
  document.documentElement.style.overflow = previousStyles.htmlOverflow;
  document.body.style.overflow = previousStyles.bodyOverflow;
  previousStyles = null;
}

/** Locks document scrolling until the returned release function is called. */
export function acquireScrollLock(): () => void {
  if (typeof document === "undefined") return () => undefined;

  if (activeLocks.size === 0) {
    previousStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  const lock = Symbol("scroll-lock");
  activeLocks.add(lock);
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeLocks.delete(lock);
    if (activeLocks.size === 0) restorePreviousStyles();
  };
}

/** Clears locks left behind by a route transition or an interrupted unmount. */
export function resetScrollLocks() {
  if (typeof document === "undefined") return;
  activeLocks.clear();
  restorePreviousStyles();
}
