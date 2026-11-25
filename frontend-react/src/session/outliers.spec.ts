import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { outlierCards } from './outliers';

function outliers(cards: Card[]): Card[] {
  return [...outlierCards(cards.map((card) => ({ card })))].sort();
}

describe('outlierCards', () => {
  it.each<[Card[], Card[]]>([
    [[], []],
    [['5'], []],
    [['5', '5', '5'], []],
    [['3', '5', '8'], []],
    [
      ['2', '3', '5', '8'],
      ['2', '8'],
    ],
    [
      ['1', '13'],
      ['1', '13'],
    ],
    [
      ['0', '34', '5', '5'],
      ['0', '34'],
    ],
    [['5', '?', 'COFFEE'], []],
    [['?', 'COFFEE'], []],
    [
      ['1', '21', '?'],
      ['1', '21'],
    ],
  ])('gives the outliers of %j as %j', (cards, expected) => {
    expect(outliers(cards)).toEqual([...expected].sort());
  });
});
