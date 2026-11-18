import { Component, computed, inject, input } from '@angular/core';
import { SessionStore } from '../api/session-store';
import { motifName } from './motif-name';
import { RoundTimer, formatRemaining } from './round-timer';
import { SeatTable } from './seat-table';
import { voteProgress } from './vote-progress';

@Component({
  selector: 'app-round-status',
  imports: [SeatTable, RoundTimer],
  templateUrl: './round-status.html',
  styleUrl: './round-status.scss',
})
export class RoundStatus {
  protected readonly store = inject(SessionStore);

  readonly motif = input<number | null>(null);

  private readonly progress = computed(() => voteProgress(this.store.participants()));
  protected readonly total = computed(() => this.progress().total);
  protected readonly voted = computed(() => this.progress().voted);
  protected readonly percent = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.voted() / this.total()) * 100),
  );
  protected readonly motifLabel = computed(() => {
    const motif = this.motif();
    return motif === null ? null : motifName(motif);
  });
  protected readonly discussion = computed(() => this.store.phase() === 'DISCUSSION');
  protected readonly discussionTimer = computed(() => {
    const seconds = this.store.timerSeconds();
    return seconds === null || seconds === undefined ? null : formatRemaining(seconds);
  });
}
