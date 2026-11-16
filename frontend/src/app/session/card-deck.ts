import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { CARDS, Card, cardName, cardSymbol } from './cards';

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
  protected readonly symbol = cardSymbol;
  protected readonly name = cardName;
  protected readonly myVote = computed(() => this.store.round()?.myVote ?? null);
  protected readonly sending = signal(false);

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
