import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { SessionStore } from '../api/session-store';
import { CardState, PokerCard } from './card';
import { CARDS, Card } from './cards';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];
const CHOOSE_KEYS = ['Enter', ' '];

@Component({
  selector: 'app-card-deck',
  imports: [PokerCard],
  templateUrl: './card-deck.html',
  styleUrl: './card-deck.scss',
})
export class CardDeck {
  private readonly api = inject(ApiService);
  private readonly store = inject(SessionStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly sessionId = input.required<string>();
  readonly locked = input(false);

  protected readonly cards = CARDS;
  protected readonly myVote = computed(() => this.store.round()?.myVote ?? null);
  protected readonly sending = signal(false);
  private readonly open = computed(() => !this.locked() && this.store.phase() === 'VOTING');

  protected stateOf(card: Card): CardState {
    if (this.locked()) {
      return 'locked';
    }
    return card === this.myVote() ? 'chosen' : 'open';
  }

  protected choose(card: Card): void {
    if (this.sending() || !this.open()) {
      return;
    }
    this.sending.set(true);
    this.api.vote(this.sessionId(), { card }).subscribe({
      next: () => this.sending.set(false),
      error: () => this.sending.set(false),
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const buttons = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    );
    const index = buttons.findIndex((button) => button === event.target);
    if (index < 0) {
      return;
    }
    if (CHOOSE_KEYS.includes(event.key)) {
      event.preventDefault();
      this.choose(this.cards[index]);
      return;
    }
    const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : step === 0
            ? null
            : (index + step + buttons.length) % buttons.length;
    if (target !== null) {
      event.preventDefault();
      buttons[target].focus();
    }
  }

  protected onKeyup(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }
}
