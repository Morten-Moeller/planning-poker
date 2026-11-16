import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { cardName, cardSymbol } from './cards';
import { ConfirmResultData, ConfirmResultDialog } from './confirm-result-dialog';
import { averageText } from './round-stats';

@Component({
  selector: 'app-round-result',
  imports: [MatButtonModule],
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
        data: { sessionId: this.sessionId() },
      })
      .afterClosed()
      .subscribe(() => this.dialogOpen.set(false));
  }
}
