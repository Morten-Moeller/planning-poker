import { useEffect, useState } from 'react';
import { useBackend } from '../api/backend';
import { t } from './messages';
import styles from './round-timer.module.css';

const TICK_MS = 1000;
const ANNOUNCE_EVERY_SECONDS = 15;
const FINAL_SECONDS = 10;
const SYMBOL_RUNNING = '◷ ';
const SYMBOL_EXPIRED = '⏱ ';

export function remainingSeconds(deadline: string, serverNow: number): number {
  return Math.max(0, Math.ceil((Date.parse(deadline) - serverNow) / 1000));
}

export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function announces(seconds: number): boolean {
  return seconds <= FINAL_SECONDS || seconds % ANNOUNCE_EVERY_SECONDS === 0;
}

function remainingText(seconds: number): string {
  return seconds > 0
    ? t('roundTimer.remaining', { remaining: formatRemaining(seconds) })
    : t('roundTimer.expired');
}

export function RoundTimer({ deadline }: { deadline: string }) {
  const { sessions } = useBackend();
  const [remaining, setRemaining] = useState(() =>
    remainingSeconds(deadline, sessions.serverNow()),
  );
  const [timer, setTimer] = useState({ deadline, announced: remaining });
  if (timer.deadline !== deadline) {
    const now = remainingSeconds(deadline, sessions.serverNow());
    setRemaining(now);
    setTimer({ deadline, announced: now });
  } else if (timer.announced !== remaining && announces(remaining)) {
    setTimer({ deadline, announced: remaining });
  }

  useEffect(() => {
    const interval = setInterval(
      () => setRemaining(remainingSeconds(deadline, sessions.serverNow())),
      TICK_MS,
    );
    return () => clearInterval(interval);
  }, [deadline, sessions]);

  const expired = remaining === 0;
  const final = remaining > 0 && remaining <= FINAL_SECONDS;
  const announced = announces(remaining) ? remaining : timer.announced;

  return (
    <span className={styles.host}>
      <p
        className={[styles.timer, final && styles.final, expired && styles.expired]
          .filter((name) => typeof name === 'string')
          .join(' ')}
        role="timer"
        data-testid="round-timer"
      >
        <span aria-hidden="true">{expired ? SYMBOL_EXPIRED : SYMBOL_RUNNING}</span>
        {remainingText(remaining)}
      </p>
      <span className={styles.live} aria-live="polite" data-testid="round-timer-live">
        {remainingText(announced)}
      </span>
    </span>
  );
}
