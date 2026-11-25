import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { revealedDeveloper, votingDeveloper, votingScrumMaster } from '../api/examples';
import type { Card } from './cards';
import { SeatTable } from './seat-table';
import {
  SessionPart,
  asViewer,
  receiveSnapshot,
  renderInSession,
  withDeveloper,
  withParticipant,
  withRound,
} from './testing/session-snapshots';

const BEN = '01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90';
const CEM = '01973f5e-2a4d-7e3f-a041-5c6d7e8f9a01';

function show(snapshot: SessionView) {
  return renderInSession(
    <SessionPart render={(session) => <SeatTable session={session} />} />,
    snapshot,
  );
}

function revealed(votes: { participantId: string; name: string; card: Card }[]): SessionView {
  return withRound(revealedDeveloper, { votes });
}

function seat(name: string): HTMLElement {
  const found = screen.getAllByRole('listitem').find((item) => item.textContent.includes(name));
  if (found === undefined) {
    throw new Error(`no seat for ${name}`);
  }
  return found;
}

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('SeatTable', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    reducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('before the reveal', () => {
    it('is a labelled section with the title for hidden cards', async () => {
      await show(votingDeveloper);

      const table = screen.getByTestId('seat-table');
      expect(table.tagName).toBe('SECTION');
      expect(table.getAttribute('aria-label')).toBe('Karten am Tisch');
      const title = screen.getByTestId('seat-table-title');
      expect(title.tagName).toBe('H3');
      expect(title.textContent).toBe('AM TISCH · VERDECKT');
    });

    it('has one seat per developer and none for the scrum master or a viewer', async () => {
      await show(asViewer(votingScrumMaster));

      expect(screen.getAllByTestId('seat-name').map((name) => name.textContent)).toEqual([
        'Ben',
        'Cem',
      ]);
      expect(screen.getAllByTestId('seat')).toHaveLength(2);
    });

    it('shows a hidden card and „✓ geschätzt“ after a vote', async () => {
      await show(votingScrumMaster);

      const ben = within(seat('Ben'));
      expect(ben.getByRole('img', { name: 'Karte verdeckt' })).toBe(ben.getByTestId('seat-card'));
      expect(ben.getByTestId('seat-card').textContent).toBe('');
      expect(ben.getByTestId('seat-status').textContent).toBe('✓ geschätzt');
    });

    it('shows a waiting place and „ausstehend“ without a vote', async () => {
      await show(votingScrumMaster);

      const cem = within(seat('Cem'));
      expect(cem.getByTestId('seat-card').textContent).toBe('…');
      expect(cem.getByTestId('seat-card').hasAttribute('role')).toBe(false);
      expect(cem.getByTestId('seat-status').textContent).toBe('ausstehend');
    });

    it('shows „getrennt“ for a disconnected developer without a vote', async () => {
      await show(withParticipant(votingScrumMaster, 'Cem', { connected: false }));

      const cem = within(seat('Cem'));
      expect(cem.getByTestId('seat-card').textContent).toBe('getrennt');
      expect(cem.getByTestId('seat-status').textContent).toBe('getrennt');
    });

    it('keeps the hidden card of a disconnected developer with a vote', async () => {
      await show(withParticipant(votingScrumMaster, 'Ben', { connected: false }));

      const ben = within(seat('Ben'));
      expect(ben.getByTestId('seat-card').getAttribute('aria-label')).toBe('Karte verdeckt');
      expect(ben.getByTestId('seat-status').textContent).toBe('✓ geschätzt');
    });

    it('shows no value of the own vote and no result parts', async () => {
      await show(votingDeveloper);

      expect(screen.getByTestId('seat-table').textContent).not.toContain('5');
      expect(screen.queryByTestId('result-vote')).toBeNull();
      expect(screen.queryByTestId('result-vote-card')).toBeNull();
      expect(screen.queryByTestId('result-vote-outlier')).toBeNull();
    });

    it('follows the next snapshot', async () => {
      const test = await show(votingScrumMaster);

      receiveSnapshot(test, withParticipant(votingScrumMaster, 'Cem', { hasVoted: true }));

      expect(screen.getAllByTestId('seat-status').map((status) => status.textContent)).toEqual([
        '✓ geschätzt',
        '✓ geschätzt',
      ]);
    });
  });

  describe('after the reveal', () => {
    it('shows the title AUFGEDECKT and every vote with name and card', async () => {
      await show(revealedDeveloper);

      expect(screen.getByTestId('seat-table-title').textContent).toBe('AUFGEDECKT');
      expect(screen.getAllByTestId('result-vote')).toHaveLength(2);
      expect(screen.getAllByTestId('result-vote-name').map((name) => name.textContent)).toEqual([
        'Ben',
        'Cem',
      ]);
      expect(screen.getAllByTestId('result-vote-card').map((card) => card.textContent)).toEqual([
        '5',
        '8',
      ]);
      expect(screen.queryByTestId('seat')).toBeNull();
      expect(screen.queryByTestId('seat-status')).toBeNull();
    });

    it.each<[Card, string]>([
      ['8', 'Karte 8'],
      ['?', 'Karte Unklar'],
      ['COFFEE', 'Karte Kaffeepause'],
    ])('names the card %s „%s“', async (card, name) => {
      await show(revealed([{ participantId: BEN, name: 'Ben', card }]));

      expect(screen.getByRole('img', { name })).toBe(screen.getAllByTestId('result-vote-card')[0]);
    });

    it('labels the lowest and the highest card as outliers when they are far apart', async () => {
      await show(
        revealed([
          { participantId: BEN, name: 'Ben', card: '2' },
          { participantId: CEM, name: 'Cem', card: '13' },
          { participantId: 'id-dana', name: 'Dana', card: '5' },
        ]),
      );

      expect(within(seat('Ben')).getByTestId('result-vote-outlier').textContent).toBe('Ausreißer');
      expect(within(seat('Cem')).getByTestId('result-vote-outlier').textContent).toBe('Ausreißer');
      expect(within(seat('Dana')).queryByTestId('result-vote-outlier')).toBeNull();
    });

    it('labels no outlier when the cards are close', async () => {
      await show(revealedDeveloper);

      expect(screen.queryByTestId('result-vote-outlier')).toBeNull();
    });

    it('shows the vote of a developer who left the session after the others', async () => {
      await show(
        revealed([
          { participantId: 'id-gone', name: 'Dana', card: '3' },
          { participantId: BEN, name: 'Ben', card: '5' },
          { participantId: CEM, name: 'Cem', card: '8' },
        ]),
      );

      expect(screen.getAllByTestId('result-vote-name').map((name) => name.textContent)).toEqual([
        'Ben',
        'Cem',
        'Dana',
      ]);
    });

    it('keeps a seat with „–“ for a connected developer without a vote', async () => {
      await show(withDeveloper(revealedDeveloper, 'Dana'));

      const dana = within(seat('Dana'));
      expect(dana.getByTestId('seat-name').textContent).toBe('Dana');
      expect(dana.getByTestId('seat-card').textContent).toBe('–');
      expect(dana.getByTestId('seat-status').textContent).toBe('nicht geschätzt');
      expect(screen.getAllByTestId('result-vote')).toHaveLength(2);
    });

    it('keeps a seat with „getrennt“ for a disconnected developer without a vote', async () => {
      await show(withDeveloper(revealedDeveloper, 'Dana', false));

      const dana = within(seat('Dana'));
      expect(dana.getByTestId('seat-card').textContent).toBe('getrennt');
      expect(dana.getByTestId('seat-status').textContent).toBe('getrennt');
    });

    it('turns the cards over one after another, 40 ms apart, and skips seats without a vote', async () => {
      await show(
        withRound(
          {
            ...revealedDeveloper,
            participants: [
              ...revealedDeveloper.participants.slice(0, 2),
              { id: 'id-dana', name: 'Dana', role: 'DEVELOPER', connected: true, hasVoted: false },
              ...revealedDeveloper.participants.slice(2),
            ],
          },
          {},
        ),
      );

      const cards = screen.getAllByTestId('result-vote-card');
      expect(cards.map((card) => card.style.animationDelay)).toEqual(['0ms', '40ms']);
      expect(cards.every((card) => /flip/.test(card.className))).toBe(true);
      expect(/flip/.test(within(seat('Dana')).getByTestId('seat-card').className)).toBe(false);
    });

    it('does not turn the cards under reduced motion', async () => {
      reducedMotion(true);

      await show(revealedDeveloper);

      const cards = screen.getAllByTestId('result-vote-card');
      expect(cards.some((card) => /flip/.test(card.className))).toBe(false);
      expect(cards.map((card) => card.style.animationDelay)).toEqual(['', '']);
    });
  });
});
