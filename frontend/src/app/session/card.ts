import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { CardGlyphs, isGlyphCard } from './card-glyphs';
import { Card, cardLabel, cardSymbol } from './cards';

export type CardState = 'open' | 'chosen' | 'locked' | 'hidden' | 'pending' | 'revealed';
export type CardSize = 'deck' | 'seat';

const INTERACTIVE: readonly CardState[] = ['open', 'chosen', 'locked'];

@Component({
  selector: 'app-card',
  imports: [NgTemplateOutlet],
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    '[class]': 'size()',
  },
})
export class PokerCard {
  private readonly glyphs = inject(CardGlyphs);

  readonly card = input<Card | null>(null);
  readonly state = input<CardState>('open');
  readonly size = input<CardSize>('deck');
  readonly outlier = input(false);
  readonly busy = input(false);
  readonly flip = input(false);
  readonly flipDelay = input(0);
  readonly pendingText = input('…');
  readonly testId = input<string | null>(null);

  readonly picked = output<Card>();

  protected readonly interactive = computed(() => INTERACTIVE.includes(this.state()));
  protected readonly disabled = computed(() => this.state() === 'locked' || this.busy());
  protected readonly showsValue = computed(
    () => this.card() !== null && !['hidden', 'pending'].includes(this.state()),
  );
  protected readonly symbol = computed(() => {
    const card = this.card();
    return card === null ? '' : cardSymbol(card);
  });
  protected readonly glyph = computed(() => {
    const card = this.card();
    return card !== null && isGlyphCard(card) ? this.glyphs.glyph(card) : null;
  });
  protected readonly label = computed(() => {
    const card = this.card();
    if (this.state() === 'hidden') {
      return $localize`:@@card.hidden:Karte verdeckt`;
    }
    return card === null ? null : $localize`:@@card.label:Karte ${cardLabel(card)}:card:`;
  });

  protected pick(): void {
    const card = this.card();
    if (card !== null && !this.disabled()) {
      this.picked.emit(card);
    }
  }
}
