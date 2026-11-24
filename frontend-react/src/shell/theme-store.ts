import type { PreferencesStore, ThemeChoice } from '../api/preferences-store';

export interface ThemeStore {
  start(): void;
  toggle(): void;
  dark(): boolean;
  subscribe(listener: () => void): () => void;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function createThemeStore(win: Window, preferences: PreferencesStore): ThemeStore {
  const listeners = new Set<() => void>();
  let choice: ThemeChoice = 'system';
  let systemDark = false;

  const notify = () => listeners.forEach((listener) => listener());

  const apply = (next: ThemeChoice) => {
    choice = next;
    const root = win.document.documentElement;
    if (next === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', next);
    }
    notify();
  };

  const dark = () => (choice === 'system' ? systemDark : choice === 'dark');

  return {
    start() {
      const query = typeof win.matchMedia === 'function' ? win.matchMedia(DARK_QUERY) : null;
      if (query) {
        systemDark = query.matches;
        query.addEventListener('change', (event) => {
          systemDark = event.matches;
          notify();
        });
      }
      apply(preferences.read().theme);
    },
    toggle() {
      const next: ThemeChoice = dark() ? 'light' : 'dark';
      apply(next);
      preferences.save({ theme: next });
    },
    dark,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
