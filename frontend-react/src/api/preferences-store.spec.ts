import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, createPreferencesStore } from './preferences-store';
import type { Preferences } from './preferences-store';

const KEY = 'planningpoker.preferences';

const STORED: Preferences = {
  name: 'Anna',
  projectId: '1234',
  timerSeconds: 30,
  weightFilter: 'ANY',
  periodFilter: 'MONTH',
  theme: 'dark',
};

function denied(): Storage {
  throw new Error('denied');
}

describe('preferences store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has the defaults of the Angular frontend', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      name: '',
      projectId: '',
      timerSeconds: 0,
      weightFilter: 'NONE',
      periodFilter: 'ALL',
      theme: 'system',
    });
  });

  it('reads the defaults from an empty storage', () => {
    expect(createPreferencesStore(() => localStorage).read()).toEqual(DEFAULT_PREFERENCES);
  });

  it('reads every stored field', () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));

    expect(createPreferencesStore(() => localStorage).read()).toEqual(STORED);
  });

  it.each([
    { name: 'a name that is no text', stored: { name: 7 }, field: 'name' },
    { name: 'a project id that is no text', stored: { projectId: 1234 }, field: 'projectId' },
    { name: 'a timer outside the list', stored: { timerSeconds: 45 }, field: 'timerSeconds' },
    { name: 'a timer as text', stored: { timerSeconds: '30' }, field: 'timerSeconds' },
    { name: 'an unknown weight filter', stored: { weightFilter: 'SOME' }, field: 'weightFilter' },
    { name: 'an unknown period', stored: { periodFilter: 'DAY' }, field: 'periodFilter' },
    { name: 'an unknown theme', stored: { theme: 'blue' }, field: 'theme' },
  ] as const)('reads the default for $name and keeps the other fields', ({ stored, field }) => {
    localStorage.setItem(KEY, JSON.stringify({ ...STORED, ...stored }));

    expect(createPreferencesStore(() => localStorage).read()).toEqual({
      ...STORED,
      [field]: DEFAULT_PREFERENCES[field],
    });
  });

  it.each([15, 30, 60, 120, 300, 0])('reads the timer value %i', (timerSeconds) => {
    localStorage.setItem(KEY, JSON.stringify({ timerSeconds }));

    expect(createPreferencesStore(() => localStorage).read().timerSeconds).toBe(timerSeconds);
  });

  it.each([
    { name: 'invalid JSON', value: '{not json' },
    { name: 'a list', value: '[1]' },
    { name: 'a number', value: '7' },
    { name: 'null', value: 'null' },
  ])('reads the defaults from $name', ({ value }) => {
    localStorage.setItem(KEY, value);

    expect(createPreferencesStore(() => localStorage).read()).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves the changes and keeps the stored fields', () => {
    localStorage.setItem(KEY, JSON.stringify(STORED));
    const store = createPreferencesStore(() => localStorage);

    store.save({ name: 'Ben', timerSeconds: 60 });

    expect(store.read()).toEqual({ ...STORED, name: 'Ben', timerSeconds: 60 });
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toEqual({
      ...STORED,
      name: 'Ben',
      timerSeconds: 60,
    });
  });

  it('saves into an empty storage and replaces a stored value that is no object', () => {
    const store = createPreferencesStore(() => localStorage);

    store.save({ theme: 'light' });
    expect(store.read()).toEqual({ ...DEFAULT_PREFERENCES, theme: 'light' });

    localStorage.setItem(KEY, '[1]');
    store.save({ name: 'Anna' });
    expect(store.read()).toEqual({ ...DEFAULT_PREFERENCES, name: 'Anna' });
  });

  it('reads the defaults and saves nothing when localStorage throws', () => {
    const store = createPreferencesStore(denied);

    expect(store.read()).toEqual(DEFAULT_PREFERENCES);
    expect(() => store.save({ name: 'Anna' })).not.toThrow();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
