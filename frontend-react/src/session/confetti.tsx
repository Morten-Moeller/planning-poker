import type { CSSProperties } from 'react';
import styles from './confetti.module.css';

export const PIECES = 46;

const DELAY_SPAN = 1.2;
const DURATION_MIN = 2.2;
const DURATION_SPAN = 1;
const START_MIN = 40;
const START_SPAN = 80;
const COLORS = [
  'var(--mat-sys-primary)',
  'var(--app-success)',
  'var(--app-warning)',
  'var(--app-card-accent, var(--mat-sys-primary-container))',
  'var(--mat-sys-error)',
];

export interface PieceStyle {
  '--dx': string;
  '--start': string;
  left: string;
  width: string;
  height: string;
  backgroundColor: string;
  animationDuration: string;
  animationDelay: string;
}

function thousandths(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function pieceStyle(index: number): PieceStyle {
  const width = 6 + (index % 3) * 2;
  const delay = thousandths(((index * 0.618034) % 1) * DELAY_SPAN);
  const duration = thousandths(DURATION_MIN + ((index * 0.414214) % 1) * DURATION_SPAN);
  const start = Math.round(START_MIN + ((index * 0.754878) % 1) * START_SPAN);
  return {
    '--dx': `${((index * 53) % 120) - 60}px`,
    '--start': `${-start}px`,
    left: `${(index * 37) % 100}%`,
    width: `${width}px`,
    height: `${(width * 8) / 5}px`,
    backgroundColor: COLORS[index % COLORS.length] ?? '',
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  };
}

const PIECE_STYLES = Array.from({ length: PIECES }, (_, index) => pieceStyle(index));

export function Confetti() {
  return (
    <span className={styles.confetti} data-testid="consensus-confetti" aria-hidden="true">
      {PIECE_STYLES.map((piece, index) => (
        <span key={index} className={styles.piece} style={piece as CSSProperties} />
      ))}
    </span>
  );
}
