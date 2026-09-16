export function createResilientCache<T>(loader: () => Promise<T>, freshMs: number) {
  let cached: { value: T; loadedAt: number } | null = null;
  let pending: Promise<T> | null = null;

  const refresh = () => {
    if (!pending) {
      pending = loader()
        .then((value) => {
          cached = { value, loadedAt: Date.now() };
          return value;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };

  return {
    get(): Promise<T> {
      if (cached && Date.now() - cached.loadedAt < freshMs) return Promise.resolve(cached.value);
      if (cached) {
        void refresh().catch(() => undefined);
        return Promise.resolve(cached.value);
      }
      return refresh();
    },
  };
}
