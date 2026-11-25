import type { SessionView } from '../api/api';
import { PokerCard } from './card';
import type { CardState } from './card';
import type { Card } from './cards';
import { t } from './messages';
import type { TextKey } from './messages';
import { outlierCards } from './outliers';
import { prefersReducedMotion } from './reduced-motion';
import styles from './seat-table.module.css';

const FLIP_STEP_MS = 40;
const PENDING = '…';
const NOT_VOTED = '–';

type SeatStatus = 'voted' | 'pending' | 'disconnected' | 'notVoted' | 'revealed';

interface Seat {
  id: string;
  name: string;
  card: Card | null;
  state: CardState;
  status: SeatStatus;
  outlier: boolean;
  flipIndex: number;
}

const STATUS_TEXT: Record<Exclude<SeatStatus, 'revealed'>, TextKey> = {
  voted: 'seatTable.voted',
  pending: 'seatTable.pending',
  disconnected: 'seatTable.disconnected',
  notVoted: 'seatTable.notVoted',
};

function hiddenSeats(session: SessionView): Seat[] {
  return session.participants
    .filter((participant) => participant.role === 'DEVELOPER')
    .map((developer) => ({
      id: developer.id,
      name: developer.name,
      card: null,
      state: developer.hasVoted ? 'hidden' : 'pending',
      status: developer.hasVoted ? 'voted' : developer.connected ? 'pending' : 'disconnected',
      outlier: false,
      flipIndex: 0,
    }));
}

function revealedSeats(session: SessionView): Seat[] {
  const developers = session.participants.filter((participant) => participant.role === 'DEVELOPER');
  const votes = session.round?.votes ?? [];
  const outliers = outlierCards(votes);
  const byId = new Map(votes.map((vote) => [vote.participantId, vote]));
  const seated = developers.map((developer): Seat => {
    const vote = byId.get(developer.id);
    return vote === undefined
      ? {
          id: developer.id,
          name: developer.name,
          card: null,
          state: 'pending',
          status: developer.connected ? 'notVoted' : 'disconnected',
          outlier: false,
          flipIndex: 0,
        }
      : {
          id: developer.id,
          name: developer.name,
          card: vote.card,
          state: 'revealed',
          status: 'revealed',
          outlier: outliers.has(vote.card),
          flipIndex: 0,
        };
  });
  const left = votes
    .filter((vote) => !developers.some((developer) => developer.id === vote.participantId))
    .map((vote): Seat => ({
      id: vote.participantId,
      name: vote.name,
      card: vote.card,
      state: 'revealed',
      status: 'revealed',
      outlier: outliers.has(vote.card),
      flipIndex: 0,
    }));
  let flipped = 0;
  return [...seated, ...left].map((seat) =>
    seat.state === 'revealed' ? { ...seat, flipIndex: flipped++ } : seat,
  );
}

function pendingText(status: SeatStatus): string {
  if (status === 'disconnected') {
    return t('seatTable.disconnectedCard');
  }
  return status === 'notVoted' ? NOT_VOTED : PENDING;
}

export function SeatTable({ session }: { session: SessionView }) {
  const revealed = session.phase === 'REVEALED';
  const seats = revealed ? revealedSeats(session) : hiddenSeats(session);
  const motion = !prefersReducedMotion();

  return (
    <section className={styles.table} data-testid="seat-table" aria-label={t('seatTable.label')}>
      <h3 className={styles.title} data-testid="seat-table-title">
        {revealed ? t('seatTable.revealed') : t('seatTable.hidden')}
      </h3>
      <ul className={styles.seats}>
        {seats.map((seat) => (
          <li
            key={seat.id}
            className={styles.seat}
            data-testid={seat.status === 'revealed' ? 'result-vote' : 'seat'}
          >
            <span
              className={styles.name}
              data-testid={seat.status === 'revealed' ? 'result-vote-name' : 'seat-name'}
            >
              {seat.name}
            </span>
            <PokerCard
              size="seat"
              card={seat.card}
              state={seat.state}
              outlier={seat.outlier}
              flip={motion && seat.state === 'revealed'}
              flipDelay={seat.flipIndex * FLIP_STEP_MS}
              pendingText={pendingText(seat.status)}
              testId={seat.status === 'revealed' ? 'result-vote-card' : 'seat-card'}
            />
            {seat.status !== 'revealed' && (
              <span
                className={
                  seat.status === 'voted' ? `${styles.status} ${styles.voted}` : styles.status
                }
                data-testid="seat-status"
              >
                {t(STATUS_TEXT[seat.status])}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
