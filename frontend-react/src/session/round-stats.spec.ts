import { describe, expect, it } from 'vitest';
import { averageText } from './round-stats';

describe('averageText', () => {
  it.each([
    [6.5, '6,5'],
    [5, '5,0'],
    [6.25, '6,3'],
    [0, '0,0'],
    [12.04, '12,0'],
  ])('shows %d as %s', (average, text) => {
    expect(averageText(average)).toBe(text);
  });

  it('names a missing average', () => {
    expect(averageText(null)).toBe('kein Durchschnitt');
  });
});
