import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { motifOf } from '../api/card-motif';
import {
  discussionDeveloper,
  discussionScrumMaster,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { RoundStatus } from './round-status';
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

function show(snapshot: SessionView, motif?: number) {
  return renderInSession(
    <SessionPart
      render={(session) => (
        <RoundStatus session={session} motif={motif ?? motifOf(session)}>
          <p data-testid="inside">Issue</p>
        </RoundStatus>
      )}
    />,
    snapshot,
  );
}

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

function progress(): HTMLElement {
  return screen.getByTestId('vote-progress');
}

function fill(): string {
  const indicator = progress().querySelector<HTMLElement>('[data-slot="progress-track"] > div');
  return indicator?.style.width ?? '';
}

describe('RoundStatus', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('in DISCUSSION', () => {
    it('names the phase and the round and shows the content without the table', async () => {
      await show(inRound(discussionDeveloper, 2));

      const status = screen.getByTestId('round-status');
      expect(status.tagName).toBe('SECTION');
      expect(text('round-phase')).toBe('Diskussion');
      expect(text('round-number')).toBe('Runde 2');
      expect(screen.getByTestId('round-phase').parentElement?.textContent).toBe(
        'Diskussion · Runde 2',
      );
      expect(within(status).getByTestId('inside')).toBeTruthy();
      expect(screen.queryByTestId('seat-table')).toBeNull();
      expect(screen.queryByTestId('vote-counter')).toBeNull();
      expect(screen.queryByTestId('vote-progress')).toBeNull();
      expect(screen.queryByTestId('round-timer')).toBeNull();
    });

    it.each([
      { seconds: 60, shown: '◷ 1:00 · startet mit der Schätzung' },
      { seconds: 15, shown: '◷ 0:15 · startet mit der Schätzung' },
      { seconds: 300, shown: '◷ 5:00 · startet mit der Schätzung' },
    ])('shows the timer of $seconds s that starts with the voting', async ({ seconds, shown }) => {
      await show({ ...discussionScrumMaster, timerSeconds: seconds });

      expect(text('discussion-timer')).toBe(shown);
      expect(
        screen.getByTestId('discussion-timer').querySelector('[aria-hidden="true"]')?.textContent,
      ).toBe('◷ ');
    });

    it('shows no timer without a timer of the session', async () => {
      await show({ ...discussionScrumMaster, timerSeconds: null });

      expect(screen.queryByTestId('discussion-timer')).toBeNull();
    });
  });

  describe('in VOTING', () => {
    it('shows the round, the counter, the progress and the table under the content', async () => {
      await show(votingScrumMaster);

      const status = screen.getByTestId('round-status');
      expect(text('round-number')).toBe('Runde 1');
      expect(screen.queryByTestId('round-phase')).toBeNull();
      expect(screen.queryByTestId('discussion-timer')).toBeNull();
      const counter = screen.getByTestId('vote-counter');
      expect(counter.getAttribute('role')).toBe('status');
      expect(text('vote-counter')).toBe('1 von 2 haben geschätzt');
      expect(counter.querySelector('strong')?.textContent).toBe('1 von 2');
      const inside = within(status).getByTestId('inside');
      const table = within(status).getByTestId('seat-table');
      expect(inside.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is a progress bar of the UI SDK with the count of votes as its value', async () => {
      await show(votingScrumMaster);

      const bar = screen.getByRole('progressbar', { name: 'Fortschritt der Schätzung' });
      expect(bar).toBe(progress());
      expect(bar.getAttribute('data-slot')).toBe('progress');
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('2');
      expect(bar.getAttribute('aria-valuenow')).toBe('1');
      expect(fill()).toBe('50%');
    });

    it.each([
      {
        name: 'nobody voted',
        change: { hasVoted: false },
        now: '0',
        width: '0%',
        counter: '0 von 2',
      },
      {
        name: 'both voted',
        change: { hasVoted: true },
        now: '2',
        width: '100%',
        counter: '2 von 2',
      },
    ])('shows $counter when $name', async ({ change, now, width, counter }) => {
      await show(withParticipant(withParticipant(votingScrumMaster, 'Ben', change), 'Cem', change));

      expect(progress().getAttribute('aria-valuenow')).toBe(now);
      expect(fill()).toBe(width);
      expect(text('vote-counter')).toBe(`${counter} haben geschätzt`);
    });

    it('rounds the width of one of three votes', async () => {
      await show(withDeveloper(votingScrumMaster, 'Dana'));

      expect(progress().getAttribute('aria-valuemax')).toBe('3');
      expect(fill()).toBe('33%');
    });

    it('counts neither a disconnected developer nor a viewer', async () => {
      await show(asViewer(withParticipant(votingScrumMaster, 'Cem', { connected: false })));

      expect(text('vote-counter')).toBe('1 von 1 haben geschätzt');
      expect(progress().getAttribute('aria-valuemax')).toBe('1');
      expect(fill()).toBe('100%');
    });

    it('shows an empty bar without a connected developer', async () => {
      await show(
        withParticipant(withParticipant(votingScrumMaster, 'Ben', { connected: false }), 'Cem', {
          connected: false,
        }),
      );

      expect(text('vote-counter')).toBe('0 von 0 haben geschätzt');
      expect(progress().getAttribute('role')).toBe('progressbar');
      expect(progress().getAttribute('aria-valuemax')).toBe('0');
      expect(progress().getAttribute('aria-valuenow')).toBe('0');
      expect(fill()).toBe('0%');
    });

    it('follows the votes of the next snapshot', async () => {
      const test = await show(votingScrumMaster);

      receiveSnapshot(test, withParticipant(votingScrumMaster, 'Cem', { hasVoted: true }));

      expect(text('vote-counter')).toBe('2 von 2 haben geschätzt');
      expect(progress().getAttribute('aria-valuenow')).toBe('2');
    });

    it('shows the round timer only with a deadline', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(votingDeveloper.serverTime));
      const test = await show(votingDeveloper);

      expect(text('round-timer')).toBe('◷ Noch 0:30');

      receiveSnapshot(test, withRound(votingDeveloper, { deadline: null }));

      expect(screen.queryByTestId('round-timer')).toBeNull();
    });
  });

  it.each([
    [0, 'Kartensatz: Raster'],
    [1, 'Kartensatz: Punkte'],
    [2, 'Kartensatz: Zeilen'],
    [3, 'Kartensatz: Ringe'],
    [4, 'Kartensatz: Stufen'],
    [7, 'Kartensatz: Raster'],
  ])('names the motif %i „%s“ with a swatch', async (motif, name) => {
    await show(votingDeveloper, motif);

    const label = screen.getByTestId('motif-name');
    expect(label.textContent).toBe(name);
    expect(label.querySelector('[aria-hidden="true"]')?.textContent).toBe('');
  });

  it('names the motif in DISCUSSION as well', async () => {
    await show(discussionDeveloper, 2);

    expect(text('motif-name')).toBe('Kartensatz: Zeilen');
  });
});
