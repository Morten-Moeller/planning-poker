import { Card, CARDS } from './cards';

const NUMBER_CARDS: readonly Card[] = CARDS.filter((card) => /^\d+$/.test(card));
const MAX_DISTANCE = 2;

export function outlierCards(votes: readonly { card: Card }[]): ReadonlySet<Card> {
  const positions = votes
    .map((vote) => NUMBER_CARDS.indexOf(vote.card))
    .filter((position) => position >= 0);
  if (positions.length === 0) {
    return new Set();
  }
  const lowest = Math.min(...positions);
  const highest = Math.max(...positions);
  if (highest - lowest <= MAX_DISTANCE) {
    return new Set();
  }
  return new Set([NUMBER_CARDS[lowest], NUMBER_CARDS[highest]]);
}
