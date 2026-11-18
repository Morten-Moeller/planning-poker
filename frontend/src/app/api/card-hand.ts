import { Component, input } from '@angular/core';

export type CardHandSize = 'small' | 'large';

export interface HandCard {
  readonly motif: number;
  readonly angle: number;
}

export const HAND_CARDS: readonly HandCard[] = [
  { motif: 0, angle: -20 },
  { motif: 1, angle: -10 },
  { motif: 2, angle: 0 },
  { motif: 3, angle: 10 },
  { motif: 4, angle: 20 },
];

@Component({
  selector: 'app-card-hand',
  templateUrl: './card-hand.html',
  styleUrl: './card-hand.scss',
  host: {
    '[class]': 'size()',
    'aria-hidden': 'true',
    'data-testid': 'card-hand',
  },
})
export class CardHand {
  readonly size = input<CardHandSize>('small');

  protected readonly cards = HAND_CARDS;
}
