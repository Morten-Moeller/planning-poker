import { CARDS } from './cards';
import type { Card } from './cards';

const NUMBER_CARDS: readonly Card[] = CARDS.filter((card) => /^\d+$/.test(card));
const MIN_VOTES = 2;

export function consensusCard(votes: readonly { card: Card }[]): Card | null {
  const card = votes[0]?.card;
  if (votes.length < MIN_VOTES || card === undefined || !NUMBER_CARDS.includes(card)) {
    return null;
  }
  return votes.every((vote) => vote.card === card) ? card : null;
}
