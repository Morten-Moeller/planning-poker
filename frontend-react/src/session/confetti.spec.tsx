import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Confetti, PIECES, pieceStyle } from './confetti';

describe('pieceStyle', () => {
  it('gives the fixed values of the Angular function', () => {
    expect(pieceStyle(0)).toEqual({
      '--dx': '-60px',
      '--start': '-40px',
      left: '0%',
      width: '6px',
      height: '9.6px',
      backgroundColor: 'var(--mat-sys-primary)',
      animationDuration: '2.2s',
      animationDelay: '0s',
    });
    expect(pieceStyle(7)).toEqual({
      '--dx': '-49px',
      '--start': '-63px',
      left: '59%',
      width: '8px',
      height: '12.8px',
      backgroundColor: 'var(--app-warning)',
      animationDuration: '3.099s',
      animationDelay: '0.391s',
    });
  });

  it('keeps every piece inside the limits', () => {
    const pieces = Array.from({ length: PIECES }, (_, index) => pieceStyle(index));

    for (const piece of pieces) {
      expect(Number.parseFloat(piece.animationDelay)).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(piece.animationDelay)).toBeLessThan(1.2);
      expect(Number.parseFloat(piece.animationDuration)).toBeGreaterThanOrEqual(2.2);
      expect(Number.parseFloat(piece.animationDuration)).toBeLessThan(3.2);
      expect(Number.parseFloat(piece.left)).toBeLessThan(100);
      expect(Math.abs(Number.parseFloat(piece['--dx']))).toBeLessThanOrEqual(60);
      expect(Number.parseFloat(piece['--start'])).toBeLessThanOrEqual(-40);
      expect(Number.parseFloat(piece['--start'])).toBeGreaterThanOrEqual(-120);
    }
    expect(new Set(pieces.map((piece) => piece.animationDelay)).size).toBeGreaterThan(40);
    expect(new Set(pieces.map((piece) => piece.backgroundColor)).size).toBe(5);
  });
});

describe('Confetti', () => {
  it('shows 46 pieces hidden from assistive technology', () => {
    render(<Confetti />);

    const confetti = screen.getByTestId('consensus-confetti');
    expect(confetti.getAttribute('aria-hidden')).toBe('true');
    const pieces = [...confetti.querySelectorAll<HTMLElement>(':scope > span')];
    expect(PIECES).toBe(46);
    expect(pieces).toHaveLength(46);
    expect(confetti.textContent).toBe('');
    expect(pieces[7]?.style.left).toBe('59%');
    expect(pieces[7]?.style.width).toBe('8px');
    expect(pieces[7]?.style.animationDelay).toBe('0.391s');
    expect(pieces[7]?.style.animationDuration).toBe('3.099s');
    expect(pieces[7]?.style.getPropertyValue('--dx')).toBe('-49px');
    expect(pieces[7]?.style.getPropertyValue('--start')).toBe('-63px');
  });
});
