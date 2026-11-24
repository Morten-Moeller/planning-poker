import type { ApiError } from './api-error';

export interface ErrorState {
  error(): ApiError | null;
  report(error: ApiError): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export function createErrorState(): ErrorState {
  const listeners = new Set<() => void>();
  let last: ApiError | null = null;

  const set = (next: ApiError | null) => {
    if (next === last) {
      return;
    }
    last = next;
    listeners.forEach((listener) => listener());
  };

  return {
    error: () => last,
    report: (error) => set(error),
    clear: () => set(null),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
