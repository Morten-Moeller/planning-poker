import { TestBed } from '@angular/core/testing';
import { DEFAULT_PREFERENCES, PreferencesStore } from './preferences-store';

const KEY = 'planningpoker.preferences';

describe('PreferencesStore', () => {
  let preferences: PreferencesStore;

  beforeEach(() => {
    localStorage.clear();
    preferences = TestBed.inject(PreferencesStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns the defaults without a stored entry', () => {
    expect(preferences.read()).toEqual({
      name: '',
      projectId: '',
      timerSeconds: 0,
      weightFilter: 'NONE',
      periodFilter: 'ALL',
    });
  });

  it('writes and reads the five fields under one key', () => {
    preferences.save({
      name: 'Anna',
      projectId: '42',
      timerSeconds: 30,
      weightFilter: 'ANY',
      periodFilter: 'MONTH',
    });

    expect(preferences.read()).toEqual({
      name: 'Anna',
      projectId: '42',
      timerSeconds: 30,
      weightFilter: 'ANY',
      periodFilter: 'MONTH',
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual(preferences.read());
  });

  it('keeps the other fields when one field is saved', () => {
    preferences.save({ name: 'Anna', timerSeconds: 60 });
    preferences.save({ weightFilter: 'ALL' });

    expect(preferences.read()).toEqual({
      ...DEFAULT_PREFERENCES,
      name: 'Anna',
      timerSeconds: 60,
      weightFilter: 'ALL',
    });
  });

  it.each([['not json'], ['42'], ['null'], ['[1,2]'], ['"text"']])(
    'returns the defaults for the stored value %s',
    (raw) => {
      localStorage.setItem(KEY, raw);

      expect(preferences.read()).toEqual(DEFAULT_PREFERENCES);
    },
  );

  it('replaces unknown values with their defaults and keeps the valid ones', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        name: 7,
        projectId: '42',
        timerSeconds: 7,
        weightFilter: 'X',
        periodFilter: 'DAY',
      }),
    );

    expect(preferences.read()).toEqual({ ...DEFAULT_PREFERENCES, projectId: '42' });
  });

  it('returns the defaults and does not throw when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => preferences.save({ name: 'Anna' })).not.toThrow();
    expect(preferences.read()).toEqual(DEFAULT_PREFERENCES);
  });
});
