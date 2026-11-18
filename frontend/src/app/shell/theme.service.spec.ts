import { TestBed } from '@angular/core/testing';
import { PreferencesStore } from '../api/preferences-store';
import { ThemeService } from './theme.service';

const KEY = 'planningpoker.preferences';

class FakeMediaQuery {
  private readonly listeners: ((event: { matches: boolean }) => void)[] = [];

  constructor(public matches: boolean) {}

  addEventListener(_: string, listener: (event: { matches: boolean }) => void): void {
    this.listeners.push(listener);
  }

  change(matches: boolean): void {
    this.matches = matches;
    this.listeners.forEach((listener) => listener({ matches }));
  }
}

describe('ThemeService', () => {
  let media: FakeMediaQuery;
  let theme: ThemeService;

  function start(systemDark: boolean): void {
    media = new FakeMediaQuery(systemDark);
    vi.stubGlobal('matchMedia', () => media as unknown as MediaQueryList);
    theme = TestBed.inject(ThemeService);
    theme.start();
  }

  function attribute(): string | null {
    return document.documentElement.getAttribute('data-theme');
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it.each([
    [false, false],
    [true, true],
  ])('follows the system without a stored value (system dark %s)', (systemDark, dark) => {
    start(systemDark);

    expect(theme.dark()).toBe(dark);
    expect(attribute()).toBeNull();
  });

  it('follows a change of the system without a stored value', () => {
    start(false);

    media.change(true);

    expect(theme.dark()).toBe(true);
    expect(attribute()).toBeNull();
  });

  it.each([
    [false, 'dark', true],
    [true, 'light', false],
  ])(
    'toggle switches from the visible design to the other one (system dark %s)',
    (systemDark, stored, dark) => {
      start(systemDark);

      theme.toggle();

      expect(theme.dark()).toBe(dark);
      expect(attribute()).toBe(stored);
      expect(TestBed.inject(PreferencesStore).read().theme).toBe(stored);
    },
  );

  it('toggle switches back and keeps the choice when the system changes', () => {
    start(false);

    theme.toggle();
    theme.toggle();
    media.change(true);

    expect(theme.dark()).toBe(false);
    expect(attribute()).toBe('light');
    expect(TestBed.inject(PreferencesStore).read().theme).toBe('light');
  });

  it.each([
    ['dark', false, true],
    ['light', true, false],
  ])('sets the stored value %s at the start', (stored, systemDark, dark) => {
    localStorage.setItem(KEY, JSON.stringify({ theme: stored }));

    start(systemDark);

    expect(attribute()).toBe(stored);
    expect(theme.dark()).toBe(dark);
  });
});
