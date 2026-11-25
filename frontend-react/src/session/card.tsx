import { useState } from 'react';
import type { AnimationEvent, CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import { CardGlyph, isGlyphCard } from './card-glyph';
import styles from './card.module.css';
import { cardLabel, cardSymbol } from './cards';
import type { Card } from './cards';
import { t } from './messages';
import { prefersReducedMotion } from './reduced-motion';

export type CardState = 'open' | 'chosen' | 'locked' | 'hidden' | 'pending' | 'revealed';
export type CardSize = 'deck' | 'seat';

export interface PokerCardProps {
  card?: Card | null;
  state?: CardState;
  size?: CardSize;
  outlier?: boolean;
  busy?: boolean;
  flip?: boolean;
  flipDelay?: number;
  pendingText?: string;
  testId?: string;
  unlockIndex?: number | null;
  onPick?: (card: Card) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus?: (event: FocusEvent<HTMLButtonElement>) => void;
}

const INTERACTIVE: readonly CardState[] = ['open', 'chosen', 'locked'];
const SYMBOL_CHOSEN = '✓';
const PENDING = '…';
const WIGGLE = 'wiggle';

function classes(...names: (string | false | undefined)[]): string {
  return names.filter((name) => typeof name === 'string').join(' ');
}

function Face({
  card,
  state,
  pendingText,
}: {
  card: Card | null;
  state: CardState;
  pendingText: string;
}) {
  const showsValue = card !== null && state !== 'hidden' && state !== 'pending';

  return (
    <>
      {state === 'chosen' && (
        <span className={styles.chosenLabel} aria-hidden="true">
          {SYMBOL_CHOSEN}
          <span className={styles.chosenWord}> {t('card.chosen')}</span>
        </span>
      )}
      {(state === 'open' || state === 'revealed') && (
        <span className={styles.band} aria-hidden="true" />
      )}
      {showsValue && isGlyphCard(card) && (
        <span className={styles.glyph} aria-hidden="true">
          <CardGlyph card={card} />
        </span>
      )}
      {showsValue && !isGlyphCard(card) && (
        <span className={styles.value} aria-hidden="true">
          {cardSymbol(card)}
        </span>
      )}
      {state === 'pending' && <span className={styles.pendingText}>{pendingText}</span>}
    </>
  );
}

export function PokerCard({
  card = null,
  state = 'open',
  size = 'deck',
  outlier = false,
  busy = false,
  flip = false,
  flipDelay = 0,
  pendingText = PENDING,
  testId,
  unlockIndex = null,
  onPick,
  onKeyDown,
  onKeyUp,
  onFocus,
}: PokerCardProps) {
  const [wiggle, setWiggle] = useState({ state, on: false, hovered: false });
  if (wiggle.state !== state) {
    setWiggle({ state, on: false, hovered: wiggle.hovered });
  }
  const wiggling = wiggle.state === state && wiggle.on;
  const disabled = state === 'locked' || busy;
  const label =
    state === 'hidden'
      ? t('card.hidden')
      : card === null
        ? undefined
        : t('card.label', { card: cardLabel(card) });

  const startWiggle = (hovered: boolean) => {
    const on = wiggling || (state === 'locked' && !prefersReducedMotion());
    setWiggle({ state, on, hovered });
  };

  const pick = () => {
    if (card !== null && !disabled) {
      onPick?.(card);
    }
    startWiggle(wiggle.hovered);
  };

  const endAnimation = (event: AnimationEvent) => {
    if (event.animationName.includes(WIGGLE)) {
      setWiggle({ state, on: false, hovered: wiggle.hovered });
    }
  };

  const face = <Face card={card} state={state} pendingText={pendingText} />;

  return (
    <span className={classes(styles.host, styles[size])}>
      {size === 'seat' && (
        <span className={styles.marker}>
          {outlier && (
            <span className={styles.outlierLabel} data-testid="result-vote-outlier">
              {t('card.outlier')}
            </span>
          )}
        </span>
      )}
      {INTERACTIVE.includes(state) ? (
        <button
          type="button"
          className={classes(
            styles.card,
            styles[state],
            wiggling && styles.wiggle,
            unlockIndex !== null && styles.unlock,
          )}
          style={
            unlockIndex === null
              ? undefined
              : ({ '--unlock-index': String(unlockIndex) } as CSSProperties)
          }
          data-testid={testId}
          data-unlock={unlockIndex === null ? undefined : 'true'}
          data-state={state}
          aria-label={label}
          aria-pressed={state === 'chosen'}
          aria-disabled={disabled ? 'true' : undefined}
          onClick={pick}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onFocus={onFocus}
          onMouseMove={() => {
            if (!wiggle.hovered) {
              startWiggle(true);
            }
          }}
          onMouseLeave={() => setWiggle({ state, on: wiggling, hovered: false })}
          onAnimationEnd={endAnimation}
        >
          {face}
        </button>
      ) : (
        <div
          className={classes(
            styles.card,
            styles[state],
            outlier && styles.outlier,
            flip && styles.flip,
          )}
          style={flip ? { animationDelay: `${flipDelay}ms` } : undefined}
          data-testid={testId}
          role={state === 'pending' ? undefined : 'img'}
          aria-label={state === 'pending' ? undefined : label}
        >
          {face}
        </div>
      )}
    </span>
  );
}
