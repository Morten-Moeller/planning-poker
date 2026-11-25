import { useSyncExternalStore } from 'react';

export const NARROW_LAYOUT = '(max-width: 719.98px)';

function query(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(NARROW_LAYOUT) : null;
}

function subscribe(listener: () => void): () => void {
  const media = query();
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}

function matches(): boolean {
  return query()?.matches ?? false;
}

export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, matches);
}
