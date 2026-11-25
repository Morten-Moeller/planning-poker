import type { SessionView } from '../api/api';
import { t } from './messages';
import type { TextKey } from './messages';
import styles from './session-facts.module.css';
import { useSession } from './use-session';

const PHASE_TEXT: Record<SessionView['phase'], TextKey> = {
  LOBBY: 'session.phase.LOBBY',
  DISCUSSION: 'session.phase.DISCUSSION',
  VOTING: 'session.phase.VOTING',
  REVEALED: 'session.phase.REVEALED',
};

const ROLE_TEXT: Record<SessionView['me']['role'], TextKey> = {
  SCRUM_MASTER: 'session.role.SCRUM_MASTER',
  DEVELOPER: 'session.role.DEVELOPER',
  VIEWER: 'session.role.VIEWER',
};

export function SessionFacts() {
  const session = useSession();
  if (session === null) {
    return null;
  }
  const developers = session.participants.filter(
    (participant) => participant.role === 'DEVELOPER',
  ).length;
  const viewers = session.participants.filter(
    (participant) => participant.role === 'VIEWER',
  ).length;

  return (
    <section className={styles.facts} data-testid="session-facts">
      <h2 className={styles.title}>{t('facts.title')}</h2>
      <dl className={styles.list}>
        <dt className={styles.term}>{t('session.idLabel')}</dt>
        <dd className={`${styles.value} ${styles.id}`} data-testid="session-id">
          {session.sessionId}
        </dd>
        <dt className={styles.term}>{t('session.phaseLabel')}</dt>
        <dd className={styles.value} data-testid="session-phase">
          {t(PHASE_TEXT[session.phase])}
        </dd>
        <dt className={styles.term}>{t('session.roleLabel')}</dt>
        <dd className={styles.value} data-testid="session-role">
          {t(ROLE_TEXT[session.me.role])}
        </dd>
        <dt className={styles.term}>{t('session.participantsLabel')}</dt>
        <dd className={styles.value} data-testid="session-participants">
          <span data-testid="session-participant-count">{session.participants.length}</span>{' '}
          <span data-testid="session-developer-count">
            {viewers > 0
              ? t('facts.developersAndViewers', { developers, viewers })
              : t('facts.developers', { developers })}
          </span>
        </dd>
      </dl>
    </section>
  );
}
