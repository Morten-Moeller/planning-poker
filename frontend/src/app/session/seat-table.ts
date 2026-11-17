import { DOCUMENT, Component, computed, inject } from '@angular/core';
import { SessionStore } from '../api/session-store';
import { CardState, PokerCard } from './card';
import { Card } from './cards';
import { outlierCards } from './outliers';
import { prefersReducedMotion } from './reduced-motion';

const FLIP_STEP_MS = 40;

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

@Component({
  selector: 'app-seat-table',
  imports: [PokerCard],
  templateUrl: './seat-table.html',
  styleUrl: './seat-table.scss',
})
export class SeatTable {
  private readonly store = inject(SessionStore);

  protected readonly revealed = computed(() => this.store.phase() === 'REVEALED');
  protected readonly motion = !prefersReducedMotion(inject(DOCUMENT));
  protected readonly flipStep = FLIP_STEP_MS;
  protected readonly disconnectedCard = $localize`:@@seatTable.disconnectedCard:getrennt`;
  protected readonly seats = computed<Seat[]>(() => {
    const developers = this.store
      .participants()
      .filter((participant) => participant.role === 'DEVELOPER');
    if (!this.revealed()) {
      return developers.map((developer) => ({
        id: developer.id,
        name: developer.name,
        card: null,
        state: developer.hasVoted ? 'hidden' : 'pending',
        status: developer.hasVoted ? 'voted' : developer.connected ? 'pending' : 'disconnected',
        outlier: false,
        flipIndex: 0,
      }));
    }
    const votes = this.store.round()?.votes ?? [];
    const outliers = outlierCards(votes);
    const byId = new Map(votes.map((vote) => [vote.participantId, vote]));
    const seated = developers.map((developer) => {
      const vote = byId.get(developer.id);
      return vote === undefined
        ? {
            id: developer.id,
            name: developer.name,
            card: null,
            state: 'pending' as const,
            status: developer.connected ? ('notVoted' as const) : ('disconnected' as const),
            outlier: false,
            flipIndex: 0,
          }
        : {
            id: developer.id,
            name: developer.name,
            card: vote.card,
            state: 'revealed' as const,
            status: 'revealed' as const,
            outlier: outliers.has(vote.card),
            flipIndex: 0,
          };
    });
    const left = votes
      .filter((vote) => !developers.some((developer) => developer.id === vote.participantId))
      .map((vote) => ({
        id: vote.participantId,
        name: vote.name,
        card: vote.card,
        state: 'revealed' as const,
        status: 'revealed' as const,
        outlier: outliers.has(vote.card),
        flipIndex: 0,
      }));
    let flipped = 0;
    return [...seated, ...left].map((seat) =>
      seat.state === 'revealed' ? { ...seat, flipIndex: flipped++ } : seat,
    );
  });
}
