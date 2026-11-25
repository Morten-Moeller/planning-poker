import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { SessionView } from '../api/api';
import { useBackend } from '../api/backend';
import '../styles/motifs.css';
import { CardHand } from '../ui/card-hand';
import { LOBBY_MOTIF, motifFor } from './card-motif';
import { LastResult, lastConfirmed } from './last-result';
import { t } from './messages';
import { ParticipantList } from './participant-list';
import { SessionFacts } from './session-facts';
import styles from './session-page.module.css';
import { ShareSession } from './share-session';
import { TimerSetting } from './timer-setting';
import { useSession } from './use-session';

const SESSION_NOT_FOUND = 'SESSION_NOT_FOUND';

function motifOf(session: SessionView): number {
  if (session.phase === 'LOBBY' || session.activeIssue === null || session.round === null) {
    return LOBBY_MOTIF;
  }
  return motifFor(session.sessionId, session.activeIssue.iid, session.round.number);
}

function LobbyWaiting({ session }: { session: SessionView }) {
  const afterResult = lastConfirmed(session) !== null;

  return (
    <>
      <div
        className={afterResult ? `${styles.waiting} ${styles.after}` : styles.waiting}
        role="status"
        data-testid="lobby-waiting"
      >
        <CardHand />
        <p className={styles.waitingTitle} data-testid="lobby-waiting-title">
          {afterResult ? t('session.waitingAfterResult') : t('session.waiting')}
        </p>
        <p className={styles.waitingHint}>{t('session.waitingHint')}</p>
      </div>
      <LastResult />
    </>
  );
}

function Room({ session }: { session: SessionView }) {
  const scrumMaster = session.me.role === 'SCRUM_MASTER';
  const motif = motifOf(session);
  const invites = session.invites ?? null;

  return (
    <div className={`${styles.room} motif-${motif}`} data-testid="room" data-motif={motif}>
      <div className={styles.side} data-testid="room-side">
        {scrumMaster && (
          <section className={styles.timer}>
            <h2 className={styles.sectionTitle}>{t('session.timerTitle')}</h2>
            <TimerSetting sessionId={session.sessionId} />
          </section>
        )}
        <ParticipantList />
        {invites !== null && <ShareSession sessionId={session.sessionId} invites={invites} />}
        <SessionFacts />
      </div>
      <div className={styles.main} data-testid="room-main">
        {!scrumMaster && session.phase === 'LOBBY' && <LobbyWaiting session={session} />}
      </div>
    </div>
  );
}

function SessionRoom({ sessionId }: { sessionId: string }) {
  const { errors, sessions, tokens } = useBackend();
  const session = useSession();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const unsubscribe = errors.subscribe(() => {
      if (errors.error()?.errorCode !== SESSION_NOT_FOUND) {
        return;
      }
      errors.clear();
      tokens.remove(sessionId);
      sessions.leave();
      setGone(true);
    });
    sessions.enter(sessionId);
    return () => {
      unsubscribe();
      sessions.leave();
    };
  }, [errors, sessions, tokens, sessionId]);

  if (session !== null) {
    return <Room session={session} />;
  }
  if (gone) {
    return (
      <div className={styles.gone} role="alert" data-testid="session-gone">
        <p className={styles.goneText}>{t('session.gone')}</p>
        <Link to="/" data-testid="session-gone-home">
          {t('session.goneHome')}
        </Link>
      </div>
    );
  }
  return <p data-testid="session-loading">{t('session.loading')}</p>;
}

export function SessionPage() {
  const { id = '' } = useParams();

  return (
    <>
      <h1 className={styles.visuallyHidden}>{t('session.title')}</h1>
      <SessionRoom key={id} sessionId={id} />
    </>
  );
}
