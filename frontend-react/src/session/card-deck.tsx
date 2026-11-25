import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import type { SessionView } from '../api/api';
import { useBackend } from '../api/backend';
import { PokerCard } from './card';
import type { CardState } from './card';
import styles from './card-deck.module.css';
import { CARDS } from './cards';
import type { Card } from './cards';
import { t } from './messages';
import { prefersReducedMotion } from './reduced-motion';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];
const CHOOSE_KEYS = ['Enter', ' '];

function buttonsOf(list: HTMLElement): HTMLButtonElement[] {
  return Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
}

function reveal(list: HTMLElement, element: HTMLElement): void {
  const padding = Number.parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
  const box = list.getBoundingClientRect();
  const item = element.getBoundingClientRect();
  if (item.left < box.left + padding) {
    list.scrollLeft -= box.left + padding - item.left;
  } else if (item.right > box.right - padding) {
    list.scrollLeft += item.right - (box.right - padding);
  }
}

export function CardDeck({ session, locked }: { session: SessionView; locked: boolean }) {
  const { api } = useBackend();
  const [sending, setSending] = useState(false);
  const [lock, setLock] = useState({ locked, unlocking: false });
  if (lock.locked !== locked) {
    setLock({ locked, unlocking: lock.locked && !locked && !prefersReducedMotion() });
  }
  const unlocking = lock.locked === locked && lock.unlocking;
  const list = useRef<HTMLDivElement>(null);
  const myVote = session.round?.myVote ?? null;
  const open = !locked && session.phase === 'VOTING';

  useEffect(() => {
    const index = myVote === null ? -1 : CARDS.indexOf(myVote);
    const element = list.current;
    const button = element === null ? undefined : buttonsOf(element)[index];
    if (element !== null && button !== undefined) {
      reveal(element, button);
    }
  }, [myVote]);

  const stateOf = (card: Card): CardState => {
    if (locked) {
      return 'locked';
    }
    return card === myVote ? 'chosen' : 'open';
  };

  const choose = (card: Card) => {
    if (sending || !open) {
      return;
    }
    setSending(true);
    api
      .vote(session.sessionId, { card })
      .catch(() => undefined)
      .finally(() => setSending(false));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const buttons = list.current === null ? [] : buttonsOf(list.current);
    const index = buttons.indexOf(event.currentTarget);
    const card = CARDS[index];
    if (card === undefined) {
      return;
    }
    if (CHOOSE_KEYS.includes(event.key)) {
      event.preventDefault();
      choose(card);
      return;
    }
    const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : step === 0
            ? null
            : (index + step + buttons.length) % buttons.length;
    if (target !== null) {
      event.preventDefault();
      buttons[target]?.focus();
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
    }
  };

  const onFocus = (event: FocusEvent<HTMLButtonElement>) => {
    if (list.current !== null) {
      reveal(list.current, event.currentTarget);
    }
  };

  return (
    <section className={styles.deck} data-testid={locked ? 'card-deck-locked' : 'card-deck'}>
      <div className={styles.head}>
        <h2 className={styles.title}>{locked ? t('cardDeck.titleLocked') : t('cardDeck.title')}</h2>
        {locked ? (
          <p className={styles.hint} role="status" data-testid="discussion-hint">
            {t('roundStatus.discussion')}
          </p>
        ) : (
          <p className={styles.hint} data-testid="card-deck-hint">
            {t('cardDeck.hint')}
          </p>
        )}
      </div>
      <div ref={list} className={styles.cards} role="group" aria-label={t('cardDeck.groupLabel')}>
        {CARDS.map((card, index) => (
          <PokerCard
            key={card}
            card={card}
            state={stateOf(card)}
            busy={sending}
            testId={`card-${card}`}
            unlockIndex={unlocking ? index : null}
            onPick={choose}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
          />
        ))}
      </div>
    </section>
  );
}
