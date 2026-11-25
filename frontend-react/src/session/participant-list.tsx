import type { SessionView } from '../api/api';
import { t } from './messages';
import styles from './participant-list.module.css';
import { useSession } from './use-session';

type Participant = SessionView['participants'][number];
type Phase = SessionView['phase'];

const SYMBOL_SCRUM_MASTER = '★ ';
const SYMBOL_VIEWER = '👁 ';
const SYMBOL_VOTED = '✓ ';
const SYMBOL_PENDING = '○ ';
const SYMBOL_CONNECTED = '● ';
const SYMBOL_DISCONNECTED = '○ ';

function classes(...names: (string | false)[]): string {
  return names.filter((name) => name !== false).join(' ');
}

function Activity({ participant, phase }: { participant: Participant; phase: Phase }) {
  if (participant.role === 'SCRUM_MASTER') {
    return (
      <span className={styles.activity} data-testid="participant-activity">
        {t('participants.moderates')}
      </span>
    );
  }
  if (participant.role === 'VIEWER') {
    return null;
  }
  if (phase === 'LOBBY' || phase === 'DISCUSSION') {
    return (
      <span className={styles.activity} data-testid="participant-activity">
        {phase === 'LOBBY' ? t('participants.ready') : t('participants.discussing')}
      </span>
    );
  }
  if (participant.hasVoted) {
    return (
      <span className={classes(styles.activity, styles.voted)}>
        <span aria-hidden="true">{SYMBOL_VOTED}</span>
        <span data-testid="participant-vote-status">{t('participants.voted')}</span>
      </span>
    );
  }
  if (phase === 'REVEALED') {
    return (
      <span className={styles.activity}>
        <span data-testid="participant-vote-status">{t('participants.notVoted')}</span>
      </span>
    );
  }
  return (
    <span className={classes(styles.activity, styles.pending)}>
      <span aria-hidden="true">{SYMBOL_PENDING}</span>
      <span data-testid="participant-vote-status">{t('participants.pending')}</span>
    </span>
  );
}

function ParticipantRow({
  participant,
  phase,
  me,
}: {
  participant: Participant;
  phase: Phase;
  me: boolean;
}) {
  const developer = participant.role === 'DEVELOPER';
  const round = phase === 'VOTING' || phase === 'REVEALED';
  const voted = round && developer && participant.hasVoted;

  return (
    <li
      className={classes(
        styles.row,
        me && styles.me,
        !participant.connected && styles.disconnected,
      )}
      data-testid="participant"
      data-me={me ? 'true' : undefined}
    >
      {developer && (
        <span
          className={classes(styles.chip, voted ? styles.filled : styles.empty)}
          data-testid="participant-chip"
          data-filled={voted ? 'true' : 'false'}
          aria-hidden="true"
        />
      )}
      <span className={styles.body}>
        <span className={styles.head}>
          <span className={styles.name} data-testid="participant-name">
            {participant.name}
          </span>
          {me && (
            <span className={styles.you} data-testid="participant-me">
              {t('participants.me')}
            </span>
          )}
          {participant.role === 'SCRUM_MASTER' && (
            <span className={styles.role}>
              <span aria-hidden="true">{SYMBOL_SCRUM_MASTER}</span>
              <span data-testid="participant-role">{t('participants.scrumMaster')}</span>
            </span>
          )}
          {participant.role === 'VIEWER' && (
            <span className={styles.role}>
              <span aria-hidden="true">{SYMBOL_VIEWER}</span>
              <span data-testid="participant-role">{t('participants.viewer')}</span>
            </span>
          )}
        </span>
        <Activity participant={participant} phase={phase} />
      </span>
      <span className={styles.connection}>
        <span aria-hidden="true">
          {participant.connected ? SYMBOL_CONNECTED : SYMBOL_DISCONNECTED}
        </span>
        <span data-testid="participant-status">
          {participant.connected ? t('participants.connected') : t('participants.disconnected')}
        </span>
      </span>
    </li>
  );
}

export function ParticipantList() {
  const session = useSession();
  if (session === null) {
    return null;
  }
  const participants = [
    ...session.participants.filter((participant) => participant.role !== 'VIEWER'),
    ...session.participants.filter((participant) => participant.role === 'VIEWER'),
  ];

  return (
    <section className={styles.participants}>
      <h2 className={styles.title} data-testid="participant-title">
        {t('participants.title', { count: session.participants.length })}
      </h2>
      <ul className={styles.list} data-testid="participant-list">
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            phase={session.phase}
            me={participant.id === session.me.participantId}
          />
        ))}
      </ul>
    </section>
  );
}
