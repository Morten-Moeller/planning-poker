export type ThemeChoice = 'system' | 'light' | 'dark';

export interface ThemeStore {
  start(): void;
  toggle(): void;
  dark(): boolean;
  subscribe(listener: () => void): () => void;
}

const KEY = 'planningpoker.preferences';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

function readStored(storage: Storage): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? 'null');
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readChoice(win: Window): ThemeChoice {
  try {
    const theme = readStored(win.localStorage)['theme'];
    return CHOICES.find((choice) => choice === theme) ?? 'system';
  } catch {
    return 'system';
  }
}

function saveChoice(win: Window, choice: ThemeChoice): void {
  try {
    const storage = win.localStorage;
    storage.setItem(KEY, JSON.stringify({ ...readStored(storage), theme: choice }));
  } catch {
    return;
  }
}

export function createThemeStore(win: Window): ThemeStore {
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
      apply(readChoice(win));
    },
    toggle() {
      const next: ThemeChoice = dark() ? 'light' : 'dark';
      apply(next);
      saveChoice(win, next);
    },
    dark,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
