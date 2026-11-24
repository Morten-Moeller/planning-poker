import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardHand } from './card-hand';

describe('CardHand', () => {
  it('renders five cards with the motif classes, fanned from -20 to +20 degrees, outside the accessibility tree', () => {
    render(<CardHand />);

    const hand = screen.getByTestId('card-hand');
    expect(hand.getAttribute('aria-hidden')).toBe('true');
    const cards = screen.getAllByTestId('card-hand-card');
    expect(cards).toHaveLength(5);
    cards.forEach((card, index) => {
      expect(hand.contains(card)).toBe(true);
      expect(card.classList.contains(`motif-${index}`)).toBe(true);
      expect(card.hasAttribute('data-motif')).toBe(false);
    });
    expect(cards.map((card) => card.style.getPropertyValue('--card-angle'))).toEqual([
      '-20deg',
      '-10deg',
      '0deg',
      '10deg',
      '20deg',
    ]);
  });

  it('has the size small without a size', () => {
    render(<CardHand />);

    expect(screen.getByTestId('card-hand').getAttribute('data-size')).toBe('small');
  });

  it.each(['small', 'large'] as const)('has the size %s when it is set', (size) => {
    render(<CardHand size={size} />);

    expect(screen.getByTestId('card-hand').getAttribute('data-size')).toBe(size);
  });
});
