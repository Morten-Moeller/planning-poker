import { Card } from './cards';
import { outlierCards } from './outliers';

describe('outlierCards', () => {
  it.each<[Card[], Card[]]>([
    [
      ['1', '3', '13'],
      ['1', '13'],
    ],
    [['3', '5', '8'], []],
    [
      ['3', '13'],
      ['3', '13'],
    ],
    [
      ['0', '34', '34'],
      ['0', '34'],
    ],
    [['5', '?', 'COFFEE'], []],
    [
      ['2', '?', '21'],
      ['2', '21'],
    ],
    [['?', 'COFFEE'], []],
    [['8', '8'], []],
    [[], []],
  ])('returns the outliers of %j as %j', (cards, expected) => {
    const result = outlierCards(cards.map((card) => ({ card })));

    expect([...result].sort()).toEqual([...expected].sort());
  });
});
