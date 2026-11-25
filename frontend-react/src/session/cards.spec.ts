import { describe, expect, it } from 'vitest';
import { CARDS, cardLabel, cardName, cardSymbol } from './cards';
import type { Card } from './cards';

const CASES: readonly { card: Card; symbol: string; name: string | null }[] = [
  { card: '0', symbol: '0', name: null },
  { card: '1', symbol: '1', name: null },
  { card: '2', symbol: '2', name: null },
  { card: '3', symbol: '3', name: null },
  { card: '5', symbol: '5', name: null },
  { card: '8', symbol: '8', name: null },
  { card: '13', symbol: '13', name: null },
  { card: '21', symbol: '21', name: null },
  { card: '34', symbol: '34', name: null },
  { card: '?', symbol: '?', name: 'Unklar' },
  { card: 'COFFEE', symbol: '☕', name: 'Kaffeepause' },
];

describe('cards', () => {
  it.each(CASES)(
    'shows the card $card as $symbol with the name $name',
    ({ card, symbol, name }) => {
      expect(cardSymbol(card)).toBe(symbol);
      expect(cardName(card)).toBe(name);
    },
  );

  it('has the eleven cards in the order of the deck', () => {
    expect(CARDS).toEqual(CASES.map((entry) => entry.card));
  });

  it.each(CASES)('labels the card $card with its name or its value', ({ card, name }) => {
    expect(cardLabel(card)).toBe(name ?? card);
  });
});
