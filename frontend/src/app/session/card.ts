import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { CardGlyphs, isGlyphCard } from './card-glyphs';
import { Card, cardLabel, cardSymbol } from './cards';
import { prefersReducedMotion } from './reduced-motion';

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
  private readonly document = inject(DOCUMENT);

  readonly card = input<Card | null>(null);
  readonly state = input<CardState>('open');
  readonly size = input<CardSize>('deck');
  readonly outlier = input(false);
  readonly busy = input(false);
  readonly flip = input(false);
  readonly flipDelay = input(0);
  readonly pendingText = input('…');
  readonly testId = input<string | null>(null);
  readonly unlockIndex = input<number | null>(null);

  readonly picked = output<Card>();

  private hovered = false;
  protected readonly wiggling = linkedSignal({ source: this.state, computation: () => false });
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
    this.wiggle();
  }

  protected onMouseMove(): void {
    if (!this.hovered) {
      this.hovered = true;
      this.wiggle();
    }
  }

  protected onMouseLeave(): void {
    this.hovered = false;
  }

  private wiggle(): void {
    if (this.state() === 'locked' && !prefersReducedMotion(this.document)) {
      this.wiggling.set(true);
    }
  }

  protected onAnimationEnd(event: AnimationEvent): void {
    if (event.animationName.endsWith('wiggle')) {
      this.wiggling.set(false);
    }
  }
}
