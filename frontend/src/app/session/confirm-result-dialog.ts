import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ErrorCode } from '../api/api-error';
import { ApiService } from '../api/api.service';
import { formErrorMessage } from '../api/error-messages';
import { ErrorState } from '../api/error-state';
import { SessionStore } from '../api/session-store';
import { CARDS, Card, cardLabel, cardSymbol } from './cards';
import { ConfirmSuccess, ConfirmSuccessData } from './confirm-success';

export interface ConfirmResultData {
  sessionId: string;
  suggestedCard?: Card | null;
}

interface CardOption {
  card: Card;
  votes: number;
  mostFrequent: boolean;
}

const CONFIRM_FORM_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
]);
const SUCCESS_DURATION_MS = 5000;

@Component({
  selector: 'app-confirm-result-dialog',
  imports: [MatButtonModule, MatDialogModule, MatProgressBarModule],
  templateUrl: './confirm-result-dialog.html',
  styleUrl: './confirm-result-dialog.scss',
})
export class ConfirmResultDialog {
  private readonly api = inject(ApiService);
  private readonly errorState = inject(ErrorState);
  private readonly snackBar = inject(MatSnackBar);
  private readonly store = inject(SessionStore);
  private readonly dialogRef = inject<MatDialogRef<ConfirmResultDialog, boolean>>(MatDialogRef);
  private readonly data = inject<ConfirmResultData>(MAT_DIALOG_DATA);

  protected readonly symbol = cardSymbol;
  protected readonly label = cardLabel;
  protected readonly issue = this.store.activeIssue();
  protected readonly writeWeight = this.store.session()?.writeWeight === true;
  protected readonly consensus = this.data.suggestedCard ?? null;
  protected readonly options = cardOptions(this.store.round()?.stats ?? null, this.consensus);
  protected readonly showMostFrequent = this.options.some((option) => option.mostFrequent);
  protected readonly selected = signal<Card | null>(this.consensus);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected select(card: Card): void {
    this.selected.set(card);
  }

  protected submit(): void {
    const card = this.selected();
    if (card === null || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    this.api.confirmRound(this.data.sessionId, { card }).subscribe({
      next: () => {
        this.snackBar.openFromComponent<ConfirmSuccess, ConfirmSuccessData>(ConfirmSuccess, {
          duration: SUCCESS_DURATION_MS,
          data: { card, issueIid: this.issue?.iid ?? null, webUrl: this.issue?.webUrl ?? null },
        });
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.dialogRef.disableClose = false;
        const message = formErrorMessage(error, CONFIRM_FORM_ERRORS);
        if (message !== null) {
          this.errorState.clear();
          this.error.set(message);
        }
      },
    });
  }
}

type RoundStats = NonNullable<NonNullable<ReturnType<SessionStore['round']>>['stats']>;

function cardOptions(stats: RoundStats | null, consensus: Card | null): CardOption[] {
  const counts = new Map((stats?.distribution ?? []).map((entry) => [entry.card, entry.count]));
  const mostFrequent = new Set(consensus === null ? (stats?.mostFrequent ?? []) : []);
  return CARDS.map((card) => ({
    card,
    votes: counts.get(card) ?? 0,
    mostFrequent: mostFrequent.has(card),
  }));
}
