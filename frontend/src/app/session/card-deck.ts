import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ApiService, VoteRequest } from '../api/api.service';
import { SessionStore } from '../api/session-store';

export type Card = VoteRequest['card'];

export const CARDS: readonly Card[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '34',
  '?',
  'COFFEE',
];

@Component({
  selector: 'app-card-deck',
  imports: [MatButtonModule],
  templateUrl: './card-deck.html',
  styleUrl: './card-deck.scss',
})
export class CardDeck {
  private readonly api = inject(ApiService);
  private readonly store = inject(SessionStore);

  readonly sessionId = input.required<string>();

  protected readonly cards = CARDS;
  protected readonly coffeeName = $localize`:@@cardDeck.coffee:Kaffeepause`;
  protected readonly myVote = computed(() => this.store.round()?.myVote ?? null);
  protected readonly sending = signal(false);

  protected symbol(card: Card): string {
    return card === 'COFFEE' ? '☕' : card;
  }

  protected choose(card: Card): void {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.api.vote(this.sessionId(), { card }).subscribe({
      next: () => this.sending.set(false),
      error: () => this.sending.set(false),
    });
  }
}
