import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { cardLabel, cardName, cardSymbol } from './cards';
import { Confetti } from './confetti';
import { ConfirmResultData, ConfirmResultDialog } from './confirm-result-dialog';
import { consensusCard } from './consensus';
import { outlierCards } from './outliers';
import { averageText } from './round-stats';

@Component({
  selector: 'app-round-result',
  imports: [MatButtonModule, Confetti],
  templateUrl: './round-result.html',
  styleUrl: './round-result.scss',
})
export class RoundResult {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();

  protected readonly symbol = cardSymbol;
  protected readonly name = cardName;
  protected readonly round = computed(() => this.store.round());
  protected readonly votes = computed(() => this.round()?.votes ?? []);
  protected readonly outliers = computed(() => outlierCards(this.votes()));
  protected readonly consensus = computed(() => consensusCard(this.votes()));
  protected readonly developers = computed(() =>
    (this.store.session()?.participants ?? []).filter(
      (participant) => participant.role === 'DEVELOPER',
    ),
  );
  protected readonly notVoted = computed(() => {
    const voted = new Set(this.votes().map((vote) => vote.participantId));
    return this.developers()
      .filter((developer) => !voted.has(developer.id))
      .map((developer) => ({
        id: developer.id,
        label: developer.connected
          ? developer.name
          : $localize`:@@roundResult.notConnected:${developer.name}:name: (nicht verbunden)`,
      }));
  });
  protected readonly consensusText = computed(() => {
    const card = this.consensus();
    return card === null
      ? null
      : $localize`:@@roundResult.consensus:Konsens: Alle ${this.votes().length}:count: abgegebenen Stimmen zeigen ${cardLabel(card)}:card:.`;
  });
  protected readonly turnoutText = computed(() => {
    const total = this.developers().length;
    const count = this.votes().length;
    return this.notVoted().length === 0
      ? null
      : $localize`:@@roundResult.turnout:${count}:count: von ${total}:total: Entwicklern haben geschätzt.`;
  });
  protected readonly stats = computed(() => this.round()?.stats ?? null);
  protected readonly average = computed(() => averageText(this.stats()?.average ?? null));
  protected readonly confirming = computed(() => this.round()?.confirming === true);
  protected readonly restarting = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly actionsDisabled = computed(
    () => this.confirming() || this.restarting() || this.dialogOpen(),
  );

  protected restart(): void {
    if (this.actionsDisabled()) {
      return;
    }
    this.restarting.set(true);
    this.api.restartRound(this.sessionId()).subscribe({
      next: () => this.restarting.set(false),
      error: () => this.restarting.set(false),
    });
  }

  protected openConfirm(): void {
    if (this.actionsDisabled()) {
      return;
    }
    this.dialogOpen.set(true);
    this.dialog
      .open<ConfirmResultDialog, ConfirmResultData, boolean>(ConfirmResultDialog, {
        data: { sessionId: this.sessionId(), suggestedCard: this.consensus() },
      })
      .afterClosed()
      .subscribe(() => this.dialogOpen.set(false));
  }
}
