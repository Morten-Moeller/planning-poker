import { Card, CARDS } from './cards';

const NUMBER_CARDS: readonly Card[] = CARDS.filter((card) => /^\d+$/.test(card));
const MIN_VOTES = 2;

export function consensusCard(votes: readonly { card: Card }[]): Card | null {
  if (votes.length < MIN_VOTES) {
    return null;
  }
  const card = votes[0].card;
  if (!NUMBER_CARDS.includes(card)) {
    return null;
  }
  return votes.every((vote) => vote.card === card) ? card : null;
}
