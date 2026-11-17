import { Card } from './cards';
import { consensusCard } from './consensus';

describe('consensusCard', () => {
  it.each<[Card[], Card | null]>([
    [['5', '5', '5'], '5'],
    [['8', '8'], '8'],
    [['0', '0'], '0'],
    [['5', '8'], null],
    [['5'], null],
    [['?', '?'], null],
    [['COFFEE', 'COFFEE'], null],
    [['5', '5', '?'], null],
    [[], null],
  ])('returns for %j the card %j', (cards, expected) => {
    expect(consensusCard(cards.map((card) => ({ card })))).toBe(expected);
  });
});
