import type { CSSProperties } from 'react';
import '../styles/motifs.css';
import styles from './card-hand.module.css';

export type CardHandSize = 'small' | 'large';

const HAND_ANGLES: readonly number[] = [-20, -10, 0, 10, 20];

function cardStyle(angle: number): CSSProperties {
  return { '--card-angle': `${angle}deg` } as CSSProperties;
}

export function CardHand({ size = 'small' }: { size?: CardHandSize }) {
  return (
    <div className={styles.hand} data-testid="card-hand" data-size={size} aria-hidden="true">
      {HAND_ANGLES.map((angle, motif) => (
        <span
          key={motif}
          className={`${styles.card} motif-${motif}`}
          data-testid="card-hand-card"
          style={cardStyle(angle)}
        />
      ))}
    </div>
  );
}
