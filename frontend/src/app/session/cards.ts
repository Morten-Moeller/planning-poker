import type { VoteRequest } from '../api/api.service';

export type Card = VoteRequest['card'];

export const CARDS: readonly Card[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '34',
  '?',
  'COFFEE',
];

export function cardSymbol(card: Card): string {
  return card === 'COFFEE' ? '☕' : card;
}

export function cardName(card: Card): string | null {
  return card === 'COFFEE' ? $localize`:@@card.coffee:Kaffeepause` : null;
}

export function cardLabel(card: Card): string {
  return cardName(card) ?? card;
}
