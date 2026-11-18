import { Component, computed, inject, input, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../api/api.service';
import { PreferencesStore, TIMER_OFF } from '../api/preferences-store';
import { SessionStore } from '../api/session-store';

export interface TimerOption {
  seconds: number;
  label: string;
}

export const TIMER_OPTIONS: readonly TimerOption[] = [
  { seconds: TIMER_OFF, label: $localize`:@@timerSetting.off:Aus` },
  { seconds: 15, label: $localize`:@@timerSetting.15s:15 s` },
  { seconds: 30, label: $localize`:@@timerSetting.30s:30 s` },
  { seconds: 60, label: $localize`:@@timerSetting.1min:1 min` },
  { seconds: 120, label: $localize`:@@timerSetting.2min:2 min` },
  { seconds: 300, label: $localize`:@@timerSetting.5min:5 min` },
];

@Component({
  selector: 'app-timer-setting',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './timer-setting.html',
})
export class TimerSetting {
  private readonly api = inject(ApiService);
  private readonly store = inject(SessionStore);
  private readonly preferences = inject(PreferencesStore);

  readonly sessionId = input.required<string>();

  protected readonly options = TIMER_OPTIONS;
  protected readonly value = computed(() => this.store.timerSeconds() ?? TIMER_OFF);
  protected readonly sending = signal(false);

  protected change(seconds: number): void {
    this.sending.set(true);
    this.api
      .setTimer(this.sessionId(), { seconds: seconds === TIMER_OFF ? null : seconds })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.preferences.save({ timerSeconds: seconds });
        },
        error: () => this.sending.set(false),
      });
  }
}
