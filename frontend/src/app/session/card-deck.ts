import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
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

  readonly sessionId = input.required<string>();
  readonly locked = input(false);

  protected readonly cards = CARDS;
  protected readonly myVote = computed(() => this.store.round()?.myVote ?? null);
  protected readonly sending = signal(false);
  private readonly open = computed(() => !this.locked() && this.store.phase() === 'VOTING');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    afterRenderEffect(() => {
      const vote = this.myVote();
      const index = vote === null ? -1 : this.cards.indexOf(vote);
      const button = this.buttons()[index];
      if (button !== undefined) {
        this.reveal(button);
      }
    });
  }

  protected onFocusin(event: FocusEvent): void {
    if (event.target instanceof HTMLButtonElement && this.buttons().includes(event.target)) {
      this.reveal(event.target);
    }
  }

  private buttons(): HTMLButtonElement[] {
    return Array.from(this.list().nativeElement.querySelectorAll<HTMLButtonElement>('button'));
  }

  private reveal(element: HTMLElement): void {
    const list = this.list().nativeElement;
    const padding = Number.parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
    const box = list.getBoundingClientRect();
    const item = element.getBoundingClientRect();
    if (item.left < box.left + padding) {
      list.scrollLeft -= box.left + padding - item.left;
    } else if (item.right > box.right - padding) {
      list.scrollLeft += item.right - (box.right - padding);
    }
  }

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
    const buttons = this.buttons();
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
