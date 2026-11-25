import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SessionView } from '../api/api';
import { lobbyDeveloper } from '../api/examples';
import { SessionHistory } from './session-history';
import { installPopupAnimations } from './testing/popup-animations';
import {
  SessionPart,
  confirmedEntry,
  receiveSnapshot,
  renderInSession,
  unconfirmedEntry,
  withHistory,
} from './testing/session-snapshots';

function show(snapshot: SessionView) {
  return renderInSession(
    <SessionPart render={(session) => <SessionHistory session={session} />} />,
    snapshot,
  );
}

function toggle(): HTMLElement {
  return screen.getByTestId('history-toggle');
}

function text(element: HTMLElement): string {
  return element.textContent.replace(/\s+/g, ' ').trim();
}

const SECOND = confirmedEntry({
  issueIid: 43,
  issueTitle: 'Password reset',
  roundNumber: 2,
  finalCard: '8',
  revealedAt: '2026-11-16T09:20:00Z',
});

describe('SessionHistory', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('is a collapsible of the UI SDK that starts closed', async () => {
    await show(withHistory(lobbyDeveloper, unconfirmedEntry()));

    const panel = screen.getByTestId('history-panel');
    expect(panel.getAttribute('data-slot')).toBe('collapsible');
    expect(toggle().tagName).toBe('BUTTON');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(within(toggle()).getByRole('heading', { level: 2 }).textContent).toBe(
      'Sitzungsprotokoll',
    );
    expect(screen.getByTestId('history-entry').closest('[hidden]')).not.toBeNull();
  });

  it.each([
    { name: 'one round', history: [unconfirmedEntry()], count: '1 aufgelöste Runde' },
    { name: 'two rounds', history: [SECOND, unconfirmedEntry()], count: '2 aufgelöste Runden' },
  ])('counts $name as „$count“', async ({ history, count }) => {
    await show(withHistory(lobbyDeveloper, ...history));

    expect(screen.getByTestId('history-count').textContent).toBe(count);
  });

  it('opens and closes with the toggle', async () => {
    const user = userEvent.setup();
    await show(withHistory(lobbyDeveloper, unconfirmedEntry()));

    await user.click(toggle());

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('history-entry').closest('[hidden]')).toBeNull();

    await user.click(toggle());

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('shows an entry with issue, round, votes and statistics', async () => {
    await show(withHistory(lobbyDeveloper, unconfirmedEntry()));

    const entry = within(screen.getByTestId('history-entry'));
    expect(text(entry.getByTestId('history-issue'))).toBe('#42 Login page');
    expect(entry.getByRole('heading', { level: 3, hidden: true })).toBeTruthy();
    expect(text(entry.getByTestId('history-round'))).toBe('Runde 1');
    expect(entry.getAllByTestId('history-vote').map(text)).toEqual(['Ben5', 'Cem8']);
    expect(entry.getAllByTestId('history-vote').map((vote) => vote.getAttribute('role'))).toEqual([
      'listitem',
      'listitem',
    ]);
    expect(text(entry.getByTestId('history-average'))).toBe('6,5');
    expect(text(entry.getByTestId('history-most-frequent'))).toBe('5, 8');
  });

  it('shows an entry without a final value', async () => {
    await show(withHistory(lobbyDeveloper, unconfirmedEntry()));

    expect(screen.getByTestId('history-no-final-card').textContent).toBe('ohne Endwert');
    expect(screen.queryByTestId('history-final-card')).toBeNull();
  });

  it.each([
    { finalCard: '8' as const, shown: '8', name: null },
    { finalCard: '?' as const, shown: '?', name: 'Unklar' },
    { finalCard: 'COFFEE' as const, shown: '☕', name: 'Kaffeepause' },
  ])('shows the final value $finalCard', async ({ finalCard, shown, name }) => {
    await show(withHistory(lobbyDeveloper, confirmedEntry({ finalCard })));

    const final = screen.getByTestId('history-final-card');
    expect(final.textContent).toBe(shown);
    expect(final.getAttribute('aria-label')).toBe(name);
    expect(text(final.parentElement as HTMLElement)).toBe(`Endwert ${shown}`);
    expect(screen.queryByTestId('history-no-final-card')).toBeNull();
  });

  it('lists the entries in the order of the snapshot and follows the next one', async () => {
    const test = await show(withHistory(lobbyDeveloper, unconfirmedEntry()));
    expect(screen.getAllByTestId('history-entry')).toHaveLength(1);

    receiveSnapshot(test, withHistory(lobbyDeveloper, SECOND, unconfirmedEntry()));

    expect(screen.getAllByTestId('history-issue').map(text)).toEqual([
      '#43 Password reset',
      '#42 Login page',
    ]);
    expect(screen.getByTestId('history-count').textContent).toBe('2 aufgelöste Runden');
  });
});
