import type { components } from './schema';

export type WeightFilter = components['schemas']['WeightFilter'];
export type UpdatedPeriod = components['schemas']['UpdatedPeriod'];
export type ThemeChoice = 'system' | 'light' | 'dark';

export const TIMER_OFF = 0;
export const TIMER_SECONDS: readonly number[] = [TIMER_OFF, 15, 30, 60, 120, 300];
const WEIGHT_FILTERS: readonly WeightFilter[] = ['NONE', 'ANY', 'ALL'];
const UPDATED_PERIODS: readonly UpdatedPeriod[] = ['WEEK', 'MONTH', 'YEAR', 'ALL'];
const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const KEY = 'planningpoker.preferences';

export interface Preferences {
  name: string;
  projectId: string;
  timerSeconds: number;
  weightFilter: WeightFilter;
  periodFilter: UpdatedPeriod;
  theme: ThemeChoice;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
  name: '',
  projectId: '',
  timerSeconds: TIMER_OFF,
  weightFilter: 'NONE',
  periodFilter: 'ALL',
  theme: 'system',
};

export interface PreferencesStore {
  read(): Preferences;
  save(changes: Partial<Preferences>): void;
}

export type StorageAccess = () => Storage;

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function createPreferencesStore(storage: StorageAccess): PreferencesStore {
  const load = (): Record<string, unknown> => {
    try {
      const parsed: unknown = JSON.parse(storage().getItem(KEY) ?? 'null');
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  return {
    read() {
      const stored = load();
      return {
        name: text(stored['name'], DEFAULT_PREFERENCES.name),
        projectId: text(stored['projectId'], DEFAULT_PREFERENCES.projectId),
        timerSeconds: oneOf(
          stored['timerSeconds'],
          TIMER_SECONDS,
          DEFAULT_PREFERENCES.timerSeconds,
        ),
        weightFilter: oneOf(
          stored['weightFilter'],
          WEIGHT_FILTERS,
          DEFAULT_PREFERENCES.weightFilter,
        ),
        periodFilter: oneOf(
          stored['periodFilter'],
          UPDATED_PERIODS,
          DEFAULT_PREFERENCES.periodFilter,
        ),
        theme: oneOf(stored['theme'], THEME_CHOICES, DEFAULT_PREFERENCES.theme),
      };
    },
    save(changes) {
      try {
        storage().setItem(KEY, JSON.stringify({ ...load(), ...changes }));
      } catch {
        return;
      }
    },
  };
}
