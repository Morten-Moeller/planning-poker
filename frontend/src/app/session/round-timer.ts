import { Component, DestroyRef, computed, inject, linkedSignal, signal } from '@angular/core';
import { SessionStore } from '../api/session-store';

const TICK_MS = 1000;
const ANNOUNCE_EVERY_SECONDS = 15;
const FINAL_SECONDS = 10;

export function remainingSeconds(deadline: string, serverNow: number): number {
  return Math.max(0, Math.ceil((Date.parse(deadline) - serverNow) / 1000));
}

export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function announces(seconds: number): boolean {
  return seconds <= FINAL_SECONDS || seconds % ANNOUNCE_EVERY_SECONDS === 0;
}

function remainingText(seconds: number): string {
  return seconds > 0
    ? $localize`:@@roundTimer.remaining:Noch ${formatRemaining(seconds)}:remaining:`
    : $localize`:@@roundTimer.expired:Zeit abgelaufen`;
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
    return remaining === null ? '' : remainingText(remaining);
  });
  protected readonly final = computed(() => {
    const remaining = this.remaining();
    return remaining !== null && remaining > 0 && remaining <= FINAL_SECONDS;
  });
  protected readonly announcement = linkedSignal<number | null, string>({
    source: this.remaining,
    computation: (remaining, previous) => {
      if (remaining === null) {
        return '';
      }
      return previous === undefined || announces(remaining)
        ? remainingText(remaining)
        : previous.value;
    },
  });

  constructor() {
    const interval = setInterval(() => this.tick.update((value) => value + 1), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(interval));
  }
}
