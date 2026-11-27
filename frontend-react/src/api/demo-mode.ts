export interface DemoMode {
  active(): boolean;
  set(active: boolean): void;
  subscribe(listener: () => void): () => void;
}

export function createDemoMode(): DemoMode {
  const listeners = new Set<() => void>();
  let current = false;

  return {
    active: () => current,
    set(active) {
      if (active === current) {
        return;
      }
      current = active;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
