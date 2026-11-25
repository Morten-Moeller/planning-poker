import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { consensusCard } from './consensus';

function consensus(cards: Card[]): Card | null {
  return consensusCard(cards.map((card) => ({ card })));
}

describe('consensusCard', () => {
  it.each<[Card[], Card | null]>([
    [[], null],
    [['5'], null],
    [['5', '5'], '5'],
    [['13', '13', '13'], '13'],
    [['0', '0'], '0'],
    [['5', '8'], null],
    [['5', '5', '8'], null],
    [['?', '?'], null],
    [['COFFEE', 'COFFEE'], null],
    [['5', '?'], null],
  ])('gives for %j the card %j', (cards, expected) => {
    expect(consensus(cards)).toBe(expected);
  });
});
