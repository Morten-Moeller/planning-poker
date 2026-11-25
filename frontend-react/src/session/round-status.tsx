import { Progress, ProgressTrack } from '@ui-sdk/react/progress';
import type { ReactNode } from 'react';
import type { SessionView } from '../api/api';
import { t } from './messages';
import { motifName } from './motif-name';
import styles from './round-status.module.css';
import { RoundTimer, formatRemaining } from './round-timer';
import { SeatTable } from './seat-table';
import { voteProgress } from './vote-progress';

const SEPARATOR = ' · ';
const SYMBOL_TIMER = '◷ ';

export function RoundStatus({
  session,
  motif,
  children,
}: {
  session: SessionView;
  motif: number;
  children?: ReactNode;
}) {
  const discussion = session.phase === 'DISCUSSION';
  const round = session.round;
  const { total, voted } = voteProgress(session.participants);
  const timerSeconds = session.timerSeconds ?? null;
  const deadline = round?.deadline ?? null;
  const roundNumber = round === null ? null : t('roundStatus.number', { round: round.number });

  return (
    <section className={styles.roundStatus} data-testid="round-status">
      <div className={styles.bar}>
        {discussion && (
          <span className={styles.phase}>
            <span data-testid="round-phase">{t('roundStatus.phaseDiscussion')}</span>
            {roundNumber !== null && (
              <>
                {SEPARATOR}
                <span data-testid="round-number">{roundNumber}</span>
              </>
            )}
          </span>
        )}
        {discussion && timerSeconds !== null && (
          <span className={styles.discussionTimer} data-testid="discussion-timer">
            <span aria-hidden="true">{SYMBOL_TIMER}</span>
            {t('roundStatus.discussionTimer', { time: formatRemaining(timerSeconds) })}
          </span>
        )}
        {!discussion && roundNumber !== null && (
          <span className={styles.phase} data-testid="round-number">
            {roundNumber}
          </span>
        )}
        {!discussion && (
          <>
            <span className={styles.counter} role="status" data-testid="vote-counter">
              <strong>{t('roundStatus.counterValue', { voted, total })}</strong>{' '}
              {t('roundStatus.counterText')}
            </span>
            <Progress
              className={styles.progress}
              data-testid="vote-progress"
              aria-label={t('roundStatus.progress')}
              value={voted}
              min={0}
              max={total}
            >
              <ProgressTrack className={styles.progressTrack}>
                <div
                  className={styles.progressValue}
                  style={{ width: `${total === 0 ? 0 : Math.round((voted / total) * 100)}%` }}
                />
              </ProgressTrack>
            </Progress>
            {deadline !== null && <RoundTimer deadline={deadline} />}
          </>
        )}
        <span className={styles.motif} data-testid="motif-name">
          <span className={styles.swatch} aria-hidden="true" />
          {t('roundStatus.motif', { name: motifName(motif) })}
        </span>
      </div>
      {children}
      {!discussion && <SeatTable session={session} />}
    </section>
  );
}
