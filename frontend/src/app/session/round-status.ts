import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { CardDeck } from './card-deck';
import { motifName } from './motif-name';
import { RoundTimer, formatRemaining } from './round-timer';
import { SeatTable } from './seat-table';
import { TIMER_OPTIONS } from './timer-setting';

@Component({
  selector: 'app-round-status',
  imports: [MatButtonModule, CardDeck, SeatTable, RoundTimer],
  templateUrl: './round-status.html',
  styleUrl: './round-status.scss',
})
export class RoundStatus {
  private readonly api = inject(ApiService);
  protected readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();
  readonly motif = input<number | null>(null);

  private readonly developers = computed(() =>
    this.store.participants().filter((participant) => participant.role === 'DEVELOPER'),
  );
  private readonly connectedDevelopers = computed(() =>
    this.developers().filter((participant) => participant.connected),
  );
  protected readonly total = computed(() => this.connectedDevelopers().length);
  protected readonly voted = computed(
    () => this.connectedDevelopers().filter((participant) => participant.hasVoted).length,
  );
  protected readonly pending = computed(() => this.total() - this.voted());
  protected readonly percent = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.voted() / this.total()) * 100),
  );
  protected readonly allVoted = computed(() => this.store.round()?.allVoted === true);
  protected readonly absentText = computed(() => {
    const absent = this.developers()
      .filter((participant) => !participant.connected && !participant.hasVoted)
      .map((participant) => participant.name);
    if (absent.length === 0) {
      return null;
    }
    const names = absent.join(', ');
    return absent.length === 1
      ? $localize`:@@roundStatus.absentOne:${names}:names: ist getrennt und wird nicht abgewartet.`
      : $localize`:@@roundStatus.absentMany:${names}:names: sind getrennt und werden nicht abgewartet.`;
  });
  protected readonly motifLabel = computed(() => {
    const motif = this.motif();
    return motif === null ? null : motifName(motif);
  });
  protected readonly revealing = signal(false);
  protected readonly starting = signal(false);
  protected readonly discussion = computed(() => this.store.phase() === 'DISCUSSION');
  protected readonly discussionTimer = computed(() => {
    const seconds = this.store.timerSeconds();
    return seconds === null || seconds === undefined ? null : formatRemaining(seconds);
  });
  protected readonly timerLabel = computed(() => {
    const seconds = this.store.timerSeconds();
    if (seconds === null || seconds === undefined) {
      return null;
    }
    return (
      TIMER_OPTIONS.find((option) => option.seconds === seconds)?.label ??
      $localize`:@@roundStatus.timerSeconds:${seconds}:seconds: s`
    );
  });

  protected startVoting(): void {
    if (this.starting()) {
      return;
    }
    this.starting.set(true);
    this.api.startVoting(this.sessionId()).subscribe({
      next: () => this.starting.set(false),
      error: () => this.starting.set(false),
    });
  }

  protected reveal(): void {
    if (this.revealing()) {
      return;
    }
    this.revealing.set(true);
    this.api.revealRound(this.sessionId()).subscribe({
      next: () => this.revealing.set(false),
      error: () => this.revealing.set(false),
    });
  }
}
