import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreferencesStore } from '../api/preferences-store';
import { createThemeStore } from './theme-store';

const KEY = 'planningpoker.preferences';

interface SystemScheme {
  set(dark: boolean): void;
}

function stubSystemScheme(dark: boolean): SystemScheme {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const query = {
    matches: dark,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
      listeners.add(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    set(next) {
      query.matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

function createStore() {
  return createThemeStore(
    window,
    createPreferencesStore(() => localStorage),
  );
}

function storedPreferences(): unknown {
  return JSON.parse(localStorage.getItem(KEY) ?? 'null');
}

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    { system: false, next: 'dark', darkAfter: true },
    { system: true, next: 'light', darkAfter: false },
  ])(
    'switches from a system scheme with dark $system to $next and stores the choice',
    ({ system, next, darkAfter }) => {
      stubSystemScheme(system);
      const store = createStore();
      store.start();
      expect(store.dark()).toBe(system);
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

      store.toggle();

      expect(store.dark()).toBe(darkAfter);
      expect(document.documentElement.getAttribute('data-theme')).toBe(next);
      expect(storedPreferences()).toEqual({ theme: next });
    },
  );

  it('keeps the other fields of the stored preferences', () => {
    stubSystemScheme(false);
    localStorage.setItem(KEY, JSON.stringify({ name: 'Anna', timerSeconds: 30, theme: 'system' }));
    const store = createStore();
    store.start();

    store.toggle();

    expect(storedPreferences()).toEqual({ name: 'Anna', timerSeconds: 30, theme: 'dark' });
  });

  it('applies a stored choice at the start, against the system scheme', () => {
    stubSystemScheme(true);
    localStorage.setItem(KEY, JSON.stringify({ theme: 'light' }));
    const store = createStore();

    store.start();

    expect(store.dark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it.each([
    { name: 'invalid JSON', value: '{not json' },
    { name: 'an unknown theme', value: JSON.stringify({ theme: 'blue' }) },
    { name: 'a value that is no object', value: '[1]' },
  ])('follows the system scheme with $name in the storage', ({ value }) => {
    stubSystemScheme(true);
    localStorage.setItem(KEY, value);
    const store = createStore();

    store.start();

    expect(store.dark()).toBe(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('follows the system scheme and still switches when localStorage throws', () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const store = createStore();

    store.start();
    expect(store.dark()).toBe(false);
    store.toggle();

    expect(store.dark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('follows a change of the system scheme without a choice and reports it', () => {
    const system = stubSystemScheme(false);
    const store = createStore();
    store.start();
    const listener = vi.fn();
    store.subscribe(listener);

    system.set(true);

    expect(store.dark()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps a choice when the system scheme changes', () => {
    const system = stubSystemScheme(false);
    const store = createStore();
    store.start();
    store.toggle();

    system.set(false);
    system.set(true);
    store.toggle();

    expect(store.dark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('starts light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const store = createStore();

    store.start();

    expect(store.dark()).toBe(false);
  });
});
