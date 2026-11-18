import { TestBed } from '@angular/core/testing';
import { Confetti, PIECES, pieceStyle } from './confetti';

describe('pieceStyle', () => {
  it.each([
    [
      0,
      {
        '--dx': '-60px',
        '--start': '-40px',
        left: '0%',
        width: '6px',
        height: '9.6px',
        'background-color': 'var(--mat-sys-primary)',
        'animation-duration': '2.2s',
        'animation-delay': '0s',
      },
    ],
    [
      1,
      {
        '--dx': '-7px',
        '--start': '-100px',
        left: '37%',
        width: '8px',
        height: '12.8px',
        'background-color': 'var(--app-success)',
        'animation-duration': '2.614s',
        'animation-delay': '0.742s',
      },
    ],
    [
      45,
      {
        '--dx': '45px',
        '--start': '-118px',
        left: '65%',
        width: '6px',
        height: '9.6px',
        'background-color': 'var(--mat-sys-primary)',
        'animation-duration': '2.84s',
        'animation-delay': '0.974s',
      },
    ],
  ])('gives piece %i the values of the former stylesheet', (index, expected) => {
    expect(pieceStyle(index)).toEqual(expected);
  });
});

describe('Confetti', () => {
  it('renders every piece with its own position and timing', () => {
    const fixture = TestBed.createComponent(Confetti);
    fixture.detectChanges();
    const pieces: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.piece'));
    expect(pieces).toHaveLength(PIECES);
    expect(pieces[1].style.getPropertyValue('--dx')).toBe('-7px');
    expect(pieces[1].style.animationDelay).toBe('0.742s');
    expect(pieces[45].style.left).toBe('65%');
  });
});
