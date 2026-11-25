import type { components } from '../api/schema';
import { t } from './messages';

export type Card = components['schemas']['Card'];

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
