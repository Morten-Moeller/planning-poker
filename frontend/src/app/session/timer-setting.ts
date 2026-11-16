import { Component, computed, inject, input, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';

const OFF = 0;

export interface TimerOption {
  seconds: number;
  label: string;
}

export const TIMER_OPTIONS: readonly TimerOption[] = [
  { seconds: OFF, label: $localize`:@@timerSetting.off:Aus` },
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

  readonly sessionId = input.required<string>();

  protected readonly options = TIMER_OPTIONS;
  protected readonly value = computed(() => this.store.timerSeconds() ?? OFF);
  protected readonly sending = signal(false);

  protected change(seconds: number): void {
    this.sending.set(true);
    this.api.setTimer(this.sessionId(), { seconds: seconds === OFF ? null : seconds }).subscribe({
      next: () => this.sending.set(false),
      error: () => this.sending.set(false),
    });
  }
}
