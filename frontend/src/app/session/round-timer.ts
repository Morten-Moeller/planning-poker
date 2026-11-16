import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../api/session-store';

const TICK_MS = 1000;

export function remainingSeconds(deadline: string, serverNow: number): number {
  return Math.max(0, Math.ceil((Date.parse(deadline) - serverNow) / 1000));
}

export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'app-round-timer',
  templateUrl: './round-timer.html',
  styleUrl: './round-timer.scss',
})
export class RoundTimer {
  private readonly store = inject(SessionStore);
  private readonly tick = signal(0);

  protected readonly remaining = computed(() => {
    this.tick();
    const deadline = this.store.deadline();
    return deadline === null ? null : remainingSeconds(deadline, this.store.serverNow());
  });
  protected readonly text = computed(() => {
    const remaining = this.remaining();
    if (remaining === null) {
      return '';
    }
    return remaining > 0
      ? $localize`:@@roundTimer.remaining:Noch ${formatRemaining(remaining)}:remaining:`
      : $localize`:@@roundTimer.expired:Zeit abgelaufen`;
  });

  constructor() {
    const interval = setInterval(() => this.tick.update((value) => value + 1), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(interval));
  }
}
