import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { motifOf } from '../api/card-motif';
import { revealedDeveloper, revealedScrumMaster } from '../api/examples';
import type { Card } from './cards';
import { RoundResult } from './round-result';
import {
  SessionPart,
  asViewer,
  inRound,
  receiveSnapshot,
  renderInSession,
  withDeveloper,
  withParticipant,
  withRound,
} from './testing/session-snapshots';

const BEN = '01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90';
const CEM = '01973f5e-2a4d-7e3f-a041-5c6d7e8f9a01';

function show(snapshot: SessionView, motif?: number) {
  return renderInSession(
    <SessionPart
      render={(session) => (
        <RoundResult session={session} motif={motif ?? motifOf(session)}>
          <p data-testid="inside">Issue</p>
        </RoundResult>
      )}
    />,
    snapshot,
  );
}

function voted(cards: [Card, Card], base: SessionView = revealedDeveloper): SessionView {
  const distribution = [...new Set(cards)].map((card) => ({
    card,
    count: cards.filter((value) => value === card).length,
  }));
  return withRound(base, {
    votes: [
      { participantId: BEN, name: 'Ben', card: cards[0] },
      { participantId: CEM, name: 'Cem', card: cards[1] },
    ],
    stats: { distribution, average: null, mostFrequent: distribution.map((entry) => entry.card) },
  });
}

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('RoundResult', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    reducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('bar', () => {
    it('has a heading for screen readers and names the round as revealed', async () => {
      await show(inRound(revealedDeveloper, 2));

      const result = screen.getByTestId('round-result');
      expect(result.tagName).toBe('SECTION');
      expect(within(result).getByRole('heading', { level: 2 }).textContent).toBe(
        'Aufgedeckte Karten',
      );
      expect(text('round-number')).toBe('Runde 2');
      expect(screen.getByTestId('round-number').parentElement?.textContent).toBe(
        'Runde 2 · aufgelöst',
      );
    });

    it.each([
      { name: 'two votes', snapshot: revealedDeveloper, counter: '2 Schätzungen' },
      {
        name: 'one vote',
        snapshot: withRound(revealedDeveloper, {
          votes: [{ participantId: BEN, name: 'Ben', card: '5' }],
        }),
        counter: '1 Schätzung',
      },
      {
        name: 'no vote',
        snapshot: withRound(revealedDeveloper, { votes: [] }),
        counter: '0 Schätzungen',
      },
    ])('counts $name as „$counter“', async ({ snapshot, counter }) => {
      await show(snapshot);

      expect(text('result-counter')).toBe(counter);
      expect(screen.getByTestId('result-counter').querySelector('strong')?.textContent).toBe(
        counter,
      );
    });

    it.each([
      { names: ['Dana'], counter: '2 Schätzungen · Dana war getrennt' },
      { names: ['Dana', 'Emil'], counter: '2 Schätzungen · Dana, Emil waren getrennt' },
    ])('names the disconnected developers $names without a vote', async ({ names, counter }) => {
      const snapshot = names.reduce(
        (current, name) => withDeveloper(current, name, false),
        revealedDeveloper,
      );

      await show(snapshot);

      expect(text('result-counter')).toBe(counter);
    });

    it('names no disconnected developer who voted', async () => {
      await show(withParticipant(revealedDeveloper, 'Cem', { connected: false }));

      expect(text('result-counter')).toBe('2 Schätzungen');
    });

    it.each([
      [0, 'Kartensatz: Raster'],
      [3, 'Kartensatz: Ringe'],
    ])('names the motif %i „%s“', async (motif, name) => {
      await show(revealedDeveloper, motif);

      expect(text('motif-name')).toBe(name);
    });
  });

  describe('content', () => {
    it('shows the content, then the revealed table', async () => {
      await show(revealedDeveloper);

      const result = screen.getByTestId('round-result');
      const inside = within(result).getByTestId('inside');
      const table = within(result).getByTestId('seat-table');
      expect(inside.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByTestId('seat-table-title').textContent).toBe('AUFGEDECKT');
      expect(screen.getAllByTestId('result-vote-card').map((card) => card.textContent)).toEqual([
        '5',
        '8',
      ]);
      expect(screen.queryByTestId('result-empty')).toBeNull();
    });

    it('tells that no card was given', async () => {
      await show(withRound(revealedDeveloper, { votes: [], stats: null }));

      expect(text('result-empty')).toBe('Keine Karten abgegeben.');
      expect(screen.queryByTestId('result-vote')).toBeNull();
      expect(screen.queryByTestId('result-distribution')).toBeNull();
      expect(screen.queryByTestId('result-facts')).toBeNull();
    });

    it.each([
      { name: 'a developer', snapshot: revealedDeveloper },
      { name: 'the scrum master', snapshot: revealedScrumMaster },
      { name: 'a viewer', snapshot: asViewer(revealedDeveloper) },
    ])('tells $name that the result is written while it is confirmed', async ({ snapshot }) => {
      const test = await show(snapshot);
      expect(screen.queryByTestId('confirming-hint')).toBeNull();

      receiveSnapshot(test, withRound(snapshot, { confirming: true }));

      const hint = screen.getByTestId('confirming-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('Das Ergebnis wird nach GitLab geschrieben.');
    });
  });

  describe('consensus', () => {
    it('tells the consensus with the card and shows the confetti', async () => {
      await show(voted(['5', '5']));

      const hint = screen.getByTestId('consensus-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('Konsens: Alle 2 abgegebenen Stimmen zeigen 5.');
      const card = hint.previousElementSibling;
      expect(card?.textContent).toBe('5');
      expect(card?.getAttribute('aria-hidden')).toBe('true');
      const confetti = screen.getByTestId('consensus-confetti');
      expect(confetti.querySelectorAll(':scope > span')).toHaveLength(46);
      expect(screen.queryByTestId('turnout-hint')).toBeNull();
    });

    it('shows no confetti under reduced motion', async () => {
      reducedMotion(true);

      await show(voted(['5', '5']));

      expect(screen.getByTestId('consensus-hint')).toBeTruthy();
      expect(screen.queryByTestId('consensus-confetti')).toBeNull();
    });

    it.each<[[Card, Card]]>([[['5', '8']], [['?', '?']], [['COFFEE', 'COFFEE']]])(
      'shows no consensus for %j',
      async (cards) => {
        await show(voted(cards));

        expect(screen.queryByTestId('consensus-hint')).toBeNull();
        expect(screen.queryByTestId('consensus-confetti')).toBeNull();
        expect(screen.queryByTestId('turnout-hint')).toBeNull();
      },
    );

    it('shows no consensus for a single vote', async () => {
      await show(
        withRound(revealedDeveloper, {
          votes: [{ participantId: BEN, name: 'Ben', card: '5' }],
        }),
      );

      expect(screen.queryByTestId('consensus-hint')).toBeNull();
    });

    it('tells how many developers voted when one is missing', async () => {
      await show(withDeveloper(voted(['8', '8']), 'Dana'));

      expect(text('consensus-hint')).toBe('Konsens: Alle 2 abgegebenen Stimmen zeigen 8.');
      expect(text('turnout-hint')).toBe('2 von 3 Entwicklern haben geschätzt.');
    });
  });

  describe('outliers and missing votes', () => {
    it('shows the note for outliers when the cards are far apart', async () => {
      await show(voted(['2', '13']));

      const hint = screen.getByTestId('outlier-hint');
      expect(hint.textContent).toBe('Niedrigste und höchste Schätzung liegen weit auseinander.');
      const note = hint.parentElement;
      expect(note?.getAttribute('role')).toBe('note');
      expect(note?.textContent).toContain('↕ Ausreißer');
      expect(screen.getAllByTestId('result-vote-outlier')).toHaveLength(2);
    });

    it('shows no note when the cards are close', async () => {
      await show(revealedDeveloper);

      expect(screen.queryByTestId('outlier-hint')).toBeNull();
      expect(screen.queryByRole('note')).toBeNull();
    });

    it('names the developers without a vote, a disconnected one as not connected', async () => {
      await show(withDeveloper(withDeveloper(revealedDeveloper, 'Dana'), 'Emil', false));

      expect(text('not-voted')).toBe('Nicht geschätzt: Dana, Emil (nicht verbunden)');
      expect(screen.getAllByTestId('not-voted-name').map((name) => name.textContent)).toEqual([
        'Dana',
        'Emil (nicht verbunden)',
      ]);
    });

    it('shows no list when every developer voted, and never the scrum master or a viewer', async () => {
      await show(asViewer(revealedScrumMaster));

      expect(screen.queryByTestId('not-voted')).toBeNull();
    });
  });

  describe('statistics', () => {
    it('shows the distribution with bars in proportion to the largest count', async () => {
      await show(
        withRound(revealedDeveloper, {
          stats: {
            distribution: [
              { card: '5', count: 4 },
              { card: '8', count: 1 },
              { card: '?', count: 2 },
            ],
            average: 5.6,
            mostFrequent: ['5'],
          },
        }),
      );

      const panel = screen.getByTestId('result-distribution');
      expect(within(panel).getByRole('heading', { level: 3 }).textContent).toBe('VERTEILUNG');
      expect(screen.getAllByTestId('result-count')).toHaveLength(3);
      expect(screen.getAllByTestId('result-count-card').map((card) => card.textContent)).toEqual([
        '5',
        '8',
        '?',
      ]);
      expect(screen.getAllByTestId('result-count-votes').map((votes) => votes.textContent)).toEqual(
        ['4 Stimmen', '1 Stimme', '2 Stimmen'],
      );
      const widths = screen
        .getAllByTestId('result-count')
        .map((row) => row.querySelector<HTMLElement>('[aria-hidden="true"] > span')?.style.width);
      expect(widths).toEqual(['100%', '25%', '50%']);
      expect(within(panel).queryByRole('button')).toBeNull();
      expect(within(panel).getByRole('img', { name: 'Unklar' }).textContent).toBe('?');
    });

    it('shows the average and the most frequent values for orientation only', async () => {
      await show(revealedDeveloper);

      const facts = screen.getByTestId('result-facts');
      expect(within(facts).getByRole('heading', { level: 3 }).textContent).toBe('ZUR ORIENTIERUNG');
      expect(text('result-average')).toBe('6,5');
      expect(text('result-most-frequent')).toBe('5, 8');
      expect(facts.textContent).toContain('Durchschnitt (Orientierung)');
      expect(facts.textContent).toContain('Häufigste Werte (Orientierung)');
      expect(facts.textContent).toContain('Kein Vorschlag: Den Endwert legt das Team fest.');
      expect(within(facts).queryByRole('button')).toBeNull();
    });

    it('names a missing average and the cards without a number', async () => {
      await show(voted(['?', 'COFFEE']));

      expect(text('result-average')).toBe('kein Durchschnitt');
      const frequent = screen.getByTestId('result-most-frequent');
      expect(within(frequent).getByRole('img', { name: 'Unklar' }).textContent).toBe('?');
      expect(within(frequent).getByRole('img', { name: 'Kaffeepause' }).textContent).toBe('☕');
    });
  });
});
