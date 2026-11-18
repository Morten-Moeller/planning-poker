import { Injectable } from '@angular/core';
import type { UpdatedPeriod, WeightFilter } from './api.service';

export const TIMER_OFF = 0;
export const TIMER_SECONDS: readonly number[] = [TIMER_OFF, 15, 30, 60, 120, 300];
const WEIGHT_FILTERS: readonly WeightFilter[] = ['NONE', 'ANY', 'ALL'];
const UPDATED_PERIODS: readonly UpdatedPeriod[] = ['WEEK', 'MONTH', 'YEAR', 'ALL'];
const KEY = 'planningpoker.preferences';

export interface Preferences {
  name: string;
  projectId: string;
  timerSeconds: number;
  weightFilter: WeightFilter;
  periodFilter: UpdatedPeriod;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
  name: '',
  projectId: '',
  timerSeconds: TIMER_OFF,
  weightFilter: 'NONE',
  periodFilter: 'ALL',
};

@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  read(): Preferences {
    const stored = this.load();
    return {
      name: text(stored['name'], DEFAULT_PREFERENCES.name),
      projectId: text(stored['projectId'], DEFAULT_PREFERENCES.projectId),
      timerSeconds: oneOf(stored['timerSeconds'], TIMER_SECONDS, DEFAULT_PREFERENCES.timerSeconds),
      weightFilter: oneOf(stored['weightFilter'], WEIGHT_FILTERS, DEFAULT_PREFERENCES.weightFilter),
      periodFilter: oneOf(
        stored['periodFilter'],
        UPDATED_PERIODS,
        DEFAULT_PREFERENCES.periodFilter,
      ),
    };
  }

  save(changes: Partial<Preferences>): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...this.read(), ...changes }));
    } catch {
      return;
    }
  }

  private load(): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
