import type { components } from '../api/schema';
import { t } from './messages';

export type Card = components['schemas']['Card'];

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

const COFFEE_SYMBOL = '☕';

export function cardSymbol(card: Card): string {
  return card === 'COFFEE' ? COFFEE_SYMBOL : card;
}

export function cardName(card: Card): string | null {
  switch (card) {
    case 'COFFEE':
      return t('card.coffee');
    case '?':
      return t('card.unclear');
    default:
      return null;
  }
}

export function cardLabel(card: Card): string {
  return cardName(card) ?? card;
}
