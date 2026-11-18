import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { CardDeck } from './card-deck';
import { ConfirmResultData, ConfirmResultDialog } from './confirm-result-dialog';
import { consensusCard } from './consensus';
import { TIMER_OPTIONS } from './timer-setting';
import { voteProgress } from './vote-progress';

@Component({
  selector: 'app-round-footer',
  imports: [MatButtonModule, CardDeck],
  templateUrl: './round-footer.html',
  styleUrl: './round-footer.scss',
})
export class RoundFooter {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();

  private readonly progress = computed(() => voteProgress(this.store.participants()));
  protected readonly pending = computed(() => this.progress().total - this.progress().voted);
  protected readonly allVoted = computed(() => this.store.round()?.allVoted === true);
  protected readonly absentText = computed(() => {
    const absent = this.store
      .participants()
      .filter(
        (participant) =>
          participant.role === 'DEVELOPER' && !participant.connected && !participant.hasVoted,
      )
      .map((participant) => participant.name);
    if (absent.length === 0) {
      return null;
    }
    const names = absent.join(', ');
    return absent.length === 1
      ? $localize`:@@roundStatus.absentOne:${names}:names: ist getrennt und wird nicht abgewartet.`
      : $localize`:@@roundStatus.absentMany:${names}:names: sind getrennt und werden nicht abgewartet.`;
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
  protected readonly starting = signal(false);
  protected readonly revealing = signal(false);
  protected readonly restarting = signal(false);
  protected readonly dialogOpen = signal(false);
  private readonly confirming = computed(() => this.store.round()?.confirming === true);
  protected readonly resultActionsDisabled = computed(
    () => this.confirming() || this.restarting() || this.dialogOpen(),
  );

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

  protected restart(): void {
    if (this.resultActionsDisabled()) {
      return;
    }
    this.restarting.set(true);
    this.api.restartRound(this.sessionId()).subscribe({
      next: () => this.restarting.set(false),
      error: () => this.restarting.set(false),
    });
  }

  protected openConfirm(): void {
    if (this.resultActionsDisabled()) {
      return;
    }
    this.dialogOpen.set(true);
    this.dialog
      .open<ConfirmResultDialog, ConfirmResultData, boolean>(ConfirmResultDialog, {
        data: {
          sessionId: this.sessionId(),
          suggestedCard: consensusCard(this.store.round()?.votes ?? []),
        },
      })
      .afterClosed()
      .subscribe(() => this.dialogOpen.set(false));
  }
}
