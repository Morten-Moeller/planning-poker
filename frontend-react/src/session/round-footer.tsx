import { useState } from 'react';
import type { SessionView } from '../api/api';
import { useBackend } from '../api/backend';
import { AppButton } from '../ui/app-button';
import { CardDeck } from './card-deck';
import { t } from './messages';
import styles from './round-footer.module.css';
import { TIMER_OPTIONS } from './timer-setting';
import { voteProgress } from './vote-progress';

const NAME_SEPARATOR = ', ';
const SENTENCE_END = '.';

function absentText(session: SessionView): string | null {
  const absent = session.participants
    .filter(
      (participant) =>
        participant.role === 'DEVELOPER' && !participant.connected && !participant.hasVoted,
    )
    .map((participant) => participant.name);
  if (absent.length === 0) {
    return null;
  }
  const names = absent.join(NAME_SEPARATOR);
  return absent.length === 1
    ? t('roundStatus.absentOne', { names })
    : t('roundStatus.absentMany', { names });
}

function timerLabel(seconds: number | null): string | null {
  if (seconds === null) {
    return null;
  }
  const option = TIMER_OPTIONS.find((entry) => entry.seconds === seconds);
  return option === undefined ? t('roundStatus.timerSeconds', { seconds }) : t(option.label);
}

function DiscussionBox({ session }: { session: SessionView }) {
  const { api } = useBackend();
  const [starting, setStarting] = useState(false);
  const label = timerLabel(session.timerSeconds ?? null);

  const start = () => {
    if (starting) {
      return;
    }
    setStarting(true);
    api
      .startVoting(session.sessionId)
      .catch(() => undefined)
      .finally(() => setStarting(false));
  };

  return (
    <div className={styles.box}>
      <div className={styles.boxText}>
        <p className={styles.boxTitle} role="status" data-testid="discussion-hint">
          {t('roundStatus.discussionScrumMaster')}
        </p>
        <p className={styles.boxDetail}>
          {t('roundStatus.locked')}
          {label !== null && (
            <>
              {' '}
              <span data-testid="round-start-timer">{t('roundStatus.startTimer', { label })}</span>
              {SENTENCE_END}
            </>
          )}
        </p>
      </div>
      <AppButton
        variant="filled"
        className={styles.action}
        data-testid="round-start"
        disabled={starting}
        onClick={start}
      >
        {t('roundStatus.start')}
      </AppButton>
    </div>
  );
}

function VotingBox({ session }: { session: SessionView }) {
  const { api } = useBackend();
  const [revealing, setRevealing] = useState(false);
  const { total, voted } = voteProgress(session.participants);
  const allVoted = session.round?.allVoted === true;
  const absent = absentText(session);

  const reveal = () => {
    if (revealing) {
      return;
    }
    setRevealing(true);
    api
      .revealRound(session.sessionId)
      .catch(() => undefined)
      .finally(() => setRevealing(false));
  };

  return (
    <div className={allVoted ? `${styles.box} ${styles.ready}` : styles.box}>
      {allVoted ? (
        <p className={styles.boxTitle} role="status" data-testid="all-voted-hint">
          {t('roundStatus.allVoted')}
          {absent !== null && (
            <>
              {' '}
              <span data-testid="absent-hint">{absent}</span>
            </>
          )}
        </p>
      ) : (
        <p className={styles.boxPending} role="status" data-testid="pending-hint">
          {t('roundStatus.pending', { count: total - voted })}
        </p>
      )}
      <AppButton
        variant={allVoted ? 'filled' : 'outlined'}
        className={allVoted ? `${styles.action} ${styles.highlight}` : styles.action}
        data-testid="round-reveal"
        disabled={revealing}
        onClick={reveal}
      >
        {t('roundStatus.reveal')}
      </AppButton>
    </div>
  );
}

export function RoundFooter({ session }: { session: SessionView }) {
  if (session.phase !== 'DISCUSSION' && session.phase !== 'VOTING') {
    return null;
  }
  const role = session.me.role;

  return (
    <div className={styles.footer} data-testid="round-footer">
      {role === 'SCRUM_MASTER' && session.phase === 'DISCUSSION' && (
        <DiscussionBox session={session} />
      )}
      {role === 'SCRUM_MASTER' && session.phase === 'VOTING' && <VotingBox session={session} />}
      {role === 'VIEWER' && (
        <p className={styles.waiting} role="status" data-testid="viewer-hint">
          {t('roundFooter.viewer')}
        </p>
      )}
      {role === 'DEVELOPER' && (
        <CardDeck session={session} locked={session.phase === 'DISCUSSION'} />
      )}
    </div>
  );
}
