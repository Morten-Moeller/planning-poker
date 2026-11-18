import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferencesStore, ThemeChoice } from '../api/preferences-store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferences = inject(PreferencesStore);
  private readonly document = inject(DOCUMENT);
  private readonly choice = signal<ThemeChoice>('system');
  private readonly systemDark = signal(false);

  readonly dark = computed(() => {
    const choice = this.choice();
    return choice === 'system' ? this.systemDark() : choice === 'dark';
  });

  start(): void {
    const query = this.document.defaultView?.matchMedia?.(DARK_QUERY);
    if (query) {
      this.systemDark.set(query.matches);
      query.addEventListener('change', (event) => this.systemDark.set(event.matches));
    }
    this.apply(this.preferences.read().theme);
  }

  toggle(): void {
    const next: ThemeChoice = this.dark() ? 'light' : 'dark';
    this.apply(next);
    this.preferences.save({ theme: next });
  }

  private apply(choice: ThemeChoice): void {
    this.choice.set(choice);
    const root = this.document.documentElement;
    if (choice === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', choice);
    }
  }
}
