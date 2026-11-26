import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLastError } from '../api/backend';
import type { SessionView } from '../api/api';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { RequireSession } from '../api/require-session';
import { createTestBackend, problem, renderWithBackend } from '../api/testing/test-backend';
import type { Answer } from '../api/testing/test-backend';
import { motifFor } from '../api/card-motif';
import { SessionPage } from './session-page';
import { installPopupAnimations, installResizeObserver } from './testing/popup-animations';
import {
  asViewer,
  confirmedEntry,
  inRound,
  isIssueList,
  sessionAnswer,
  unconfirmedEntry,
  withHistory,
} from './testing/session-snapshots';

const ID = lobbyScrumMaster.sessionId;
const KEY = `planningpoker.session.${ID}`;
const IDENTITY = { participantId: lobbyScrumMaster.me.participantId, token: 'token-of-anna' };

function setup(answer: Answer) {
  const test = createTestBackend(answer);
  test.backend.tokens.store(ID, IDENTITY);
  const shownErrors: (string | null)[] = [];
  function ShownError() {
    shownErrors.push(useLastError()?.errorCode ?? null);
    return null;
  }
  const view = renderWithBackend(
    <>
      <ShownError />
      <Routes>
        <Route
          path="session/:id"
          element={
            <RequireSession>
              <SessionPage />
            </RequireSession>
          }
        />
        <Route path="*" element={<p data-testid="other">Andere Seite</p>} />
      </Routes>
    </>,
    test.backend,
    `/session/${ID}`,
  );
  return { ...test, shownErrors, unmount: view.unmount };
}

async function showRoom(snapshot: SessionView) {
  const test = setup(sessionAnswer(snapshot));
  const room = await screen.findByTestId('room');
  return { ...test, room };
}

function sectionTitles(room: HTMLElement): string[] {
  return within(within(room).getByTestId('room-side'))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);
}

function receive(test: ReturnType<typeof setup>, snapshot: SessionView): void {
  act(() => test.sockets.last().receive({ type: 'session.state', payload: snapshot }));
}

function expectGone(test: ReturnType<typeof setup>) {
  const gone = screen.getByTestId('session-gone');
  expect(gone.getAttribute('role')).toBe('alert');
  expect(gone.textContent).toContain('Diese Sitzung ist abgelaufen oder existiert nicht.');
  const home = screen.getByTestId('session-gone-home');
  expect(home.textContent).toBe('Zur Startseite');
  expect(home.getAttribute('href')).toBe('/');
  expect(screen.queryByTestId('session-loading')).toBeNull();
  expect(sessionStorage.getItem(KEY)).toBeNull();
  expect(test.backend.tokens.identity(ID)).toBeNull();
  expect(test.backend.sessions.session()).toBeNull();
  expect(test.backend.errors.error()).toBeNull();
  expect(test.shownErrors.every((code) => code === null)).toBe(true);
}

describe('SessionPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows that the session loads and enters the session with the stored token', async () => {
    const { backend, calls, sockets } = setup(sessionAnswer(lobbyScrumMaster));

    expect(screen.getByTestId('session-loading').textContent).toBe('Sitzung wird geladen');
    await waitFor(() => expect(backend.sessions.session()).toEqual(lobbyScrumMaster));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      `GET /api/sessions/${ID}`,
      `GET /api/sessions/${ID}/issues?weight=NONE&period=ALL`,
    ]);
    expect(calls[0]?.headers['Authorization']).toBe('Bearer token-of-anna');
    expect(sockets.sockets).toHaveLength(1);
    expect(screen.queryByTestId('session-gone')).toBeNull();
  });

  it('leaves the session when the page is left', async () => {
    const { backend, sockets, unmount } = setup(sessionAnswer(lobbyScrumMaster));
    await waitFor(() => expect(sockets.sockets).toHaveLength(1));

    unmount();

    expect(backend.sessions.session()).toBeNull();
    expect(sockets.last().closed()).toBe(true);
  });

  it('shows the state session gone when the load answers SESSION_NOT_FOUND', async () => {
    const test = setup(() => problem(404, 'SESSION_NOT_FOUND'));

    await screen.findByTestId('session-gone');

    expectGone(test);
    expect(test.sockets.sockets).toEqual([]);
  });

  it('shows the state session gone when the WebSocket reports SESSION_NOT_FOUND', async () => {
    const test = setup(sessionAnswer(lobbyScrumMaster));
    await waitFor(() => expect(test.sockets.sockets).toHaveLength(1));

    act(() =>
      test.sockets.last().receive({
        type: 'error',
        payload: { errorCode: 'SESSION_NOT_FOUND', detail: 'Unknown session.' },
      }),
    );

    expectGone(test);
    expect(test.sockets.last().closed()).toBe(true);
  });

  it('keeps the page and the error for another error code', async () => {
    const { backend } = setup(() => problem(401, 'UNAUTHORIZED'));

    await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('UNAUTHORIZED'));

    expect(screen.getByTestId('session-loading')).toBeTruthy();
    expect(screen.queryByTestId('session-gone')).toBeNull();
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });

  it('leads to the join page without a stored token and loads nothing', () => {
    sessionStorage.clear();
    const test = createTestBackend(() => Response.json(lobbyScrumMaster));

    renderWithBackend(
      <Routes>
        <Route
          path="session/:id"
          element={
            <RequireSession>
              <SessionPage />
            </RequireSession>
          }
        />
        <Route path="session/:id/join" element={<p data-testid="join">Beitritt</p>} />
      </Routes>,
      test.backend,
      `/session/${ID}`,
    );

    expect(screen.getByTestId('join')).toBeTruthy();
    expect(test.calls).toEqual([]);
  });

  it('shows the room instead of the loading text once the snapshot is there', async () => {
    const { room } = await showRoom(lobbyScrumMaster);

    expect(screen.queryByTestId('session-loading')).toBeNull();
    expect(screen.queryByTestId('session-gone')).toBeNull();
    const [side, main] = [...room.children];
    expect(side?.getAttribute('data-testid')).toBe('room-side');
    expect(main?.getAttribute('data-testid')).toBe('room-main');
    expect(room.children).toHaveLength(2);
  });

  it('keeps the heading Sitzung for screen readers only, in every state', async () => {
    const test = setup(sessionAnswer(lobbyScrumMaster));
    const loading = screen.getByRole('heading', { level: 1 });
    expect(loading.textContent).toBe('Sitzung');
    expect(loading.className).toContain('visuallyHidden');

    await screen.findByTestId('room');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('visuallyHidden');

    act(() =>
      test.sockets.last().receive({
        type: 'error',
        payload: { errorCode: 'SESSION_NOT_FOUND', detail: 'Unknown session.' },
      }),
    );
    expect(screen.getByTestId('session-gone')).toBeTruthy();
    expect(screen.queryByTestId('room')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sitzung');
  });

  it.each([
    { name: 'in LOBBY', snapshot: lobbyDeveloper, motif: 0 },
    { name: 'in LOBBY as scrum master', snapshot: lobbyScrumMaster, motif: 0 },
    { name: 'in round 1', snapshot: votingDeveloper, motif: motifFor(ID, 42, 1) },
    { name: 'in round 2', snapshot: inRound(votingDeveloper, 2), motif: 4 },
    { name: 'in round 3 of the discussion', snapshot: inRound(discussionScrumMaster, 3), motif: 3 },
    { name: 'in round 2 after the reveal', snapshot: inRound(revealedDeveloper, 2), motif: 4 },
    {
      name: 'without an active issue',
      snapshot: { ...inRound(votingDeveloper, 2), activeIssue: null },
      motif: 0,
    },
    { name: 'without a round', snapshot: { ...votingDeveloper, round: null }, motif: 0 },
    {
      name: 'in LOBBY with a round',
      snapshot: { ...inRound(votingDeveloper, 2), phase: 'LOBBY' as const },
      motif: 0,
    },
  ])('sets the motif $motif at the room $name', async ({ snapshot, motif }) => {
    const { room } = await showRoom(snapshot);

    expect(room.getAttribute('data-motif')).toBe(String(motif));
    expect(room.classList.contains(`motif-${motif}`)).toBe(true);
  });

  it('follows the motif of the next snapshot', async () => {
    const test = await showRoom(lobbyDeveloper);

    receive(test, inRound(votingDeveloper, 2));

    expect(test.room.getAttribute('data-motif')).toBe('4');
    expect(test.room.classList.contains('motif-0')).toBe(false);
  });

  it.each([
    {
      name: 'the scrum master',
      snapshot: lobbyScrumMaster,
      titles: ['Timer', 'Teilnehmer · 3', 'Teilen', 'Fakten'],
    },
    {
      name: 'the scrum master without invites',
      snapshot: { ...lobbyScrumMaster, invites: null },
      titles: ['Timer', 'Teilnehmer · 3', 'Fakten'],
    },
    { name: 'a developer', snapshot: lobbyDeveloper, titles: ['Teilnehmer · 3', 'Fakten'] },
    {
      name: 'a viewer',
      snapshot: asViewer(lobbyDeveloper),
      titles: ['Teilnehmer · 4', 'Fakten'],
    },
    {
      name: 'the scrum master while voting',
      snapshot: votingScrumMaster,
      titles: ['Timer', 'Teilnehmer · 3', 'Teilen', 'Fakten'],
    },
  ])('shows the sections of the side column to $name', async ({ snapshot, titles }) => {
    const { room } = await showRoom(snapshot);

    expect(sectionTitles(room)).toEqual(titles);
    const side = within(within(room).getByTestId('room-side'));
    expect(side.queryByTestId('timer-setting') !== null).toBe(titles.includes('Timer'));
    expect(side.queryByTestId('session-share') !== null).toBe(titles.includes('Teilen'));
    expect(side.getByTestId('participant-list')).toBeTruthy();
    expect(side.getByTestId('session-facts')).toBeTruthy();
  });

  it.each([
    { name: 'a developer', snapshot: lobbyDeveloper },
    { name: 'a viewer', snapshot: asViewer(lobbyDeveloper) },
  ])('shows the waiting state with the card hand to $name in LOBBY', async ({ snapshot }) => {
    const { room } = await showRoom(snapshot);

    const waiting = within(within(room).getByTestId('room-main')).getByTestId('lobby-waiting');
    expect(waiting.getAttribute('role')).toBe('status');
    expect(within(waiting).getByTestId('card-hand').getAttribute('data-size')).toBe('small');
    expect(within(waiting).getByTestId('lobby-waiting-title').textContent).toBe(
      'Warten, bis der Scrum Master ein Issue freigibt',
    );
    expect(waiting.textContent).toContain('Die Seite aktualisiert sich von selbst.');
    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  it('names the confirmed result in the waiting state and shows the last result under it', async () => {
    const { room } = await showRoom(withHistory(lobbyDeveloper, confirmedEntry()));

    expect(screen.getByTestId('lobby-waiting-title').textContent).toBe(
      'Das Ergebnis ist übernommen. Warten, bis der Scrum Master das nächste Issue freigibt.',
    );
    const main = within(room).getByTestId('room-main');
    expect([...main.children].map((child) => child.getAttribute('data-testid'))).toEqual([
      'lobby-waiting',
      'last-result',
    ]);
    expect(within(main).getByTestId('last-result-final-card').textContent).toBe('5');
  });

  it('keeps the first waiting title when the newest entry is not confirmed', async () => {
    await showRoom(withHistory(lobbyDeveloper, unconfirmedEntry(), confirmedEntry()));

    expect(screen.getByTestId('lobby-waiting-title').textContent).toBe(
      'Warten, bis der Scrum Master ein Issue freigibt',
    );
    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  function mainParts(room: HTMLElement): (string | null)[] {
    return [...within(room).getByTestId('room-main').children].map((part) =>
      part.getAttribute('data-testid'),
    );
  }

  it.each([
    { name: 'the scrum master in LOBBY', snapshot: lobbyScrumMaster, parts: ['issue-panel'] },
    {
      name: 'the scrum master in LOBBY after a confirmation',
      snapshot: withHistory(lobbyScrumMaster, confirmedEntry()),
      parts: ['issue-panel'],
    },
    {
      name: 'the scrum master in DISCUSSION',
      snapshot: discussionScrumMaster,
      parts: ['issue-panel', 'round-status'],
    },
    {
      name: 'the scrum master in VOTING',
      snapshot: votingScrumMaster,
      parts: ['issue-panel', 'round-status'],
    },
    {
      name: 'the scrum master in REVEALED',
      snapshot: revealedScrumMaster,
      parts: ['issue-panel', 'round-result'],
    },
    { name: 'a developer in DISCUSSION', snapshot: discussionDeveloper, parts: ['round-status'] },
    { name: 'a developer in VOTING', snapshot: votingDeveloper, parts: ['round-status'] },
    { name: 'a viewer in VOTING', snapshot: asViewer(votingDeveloper), parts: ['round-status'] },
    {
      name: 'a developer in REVEALED',
      snapshot: revealedDeveloper,
      parts: ['round-result'],
    },
    {
      name: 'a developer in DISCUSSION without an active issue',
      snapshot: { ...discussionDeveloper, activeIssue: null },
      parts: ['round-status'],
    },
  ])('shows $parts in the main area for $name', async ({ snapshot, parts }) => {
    const { room } = await showRoom(snapshot);

    expect(mainParts(room)).toEqual(parts);
    expect(screen.queryByTestId('lobby-waiting')).toBeNull();
    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  it.each([
    { name: 'DISCUSSION', snapshot: discussionDeveloper, table: false },
    { name: 'VOTING', snapshot: votingDeveloper, table: true },
  ])('puts the active issue into the round status in $name', async ({ snapshot, table }) => {
    await showRoom(snapshot);

    const status = screen.getByTestId('round-status');
    expect(within(status).getByTestId('active-issue-title').textContent).toBe('Login page');
    expect(within(status).queryByTestId('seat-table') !== null).toBe(table);
    expect(screen.getAllByTestId('active-issue')).toHaveLength(1);
  });

  it('puts the active issue and the revealed table into the round result in REVEALED', async () => {
    await showRoom(revealedDeveloper);

    const result = screen.getByTestId('round-result');
    expect(screen.queryByTestId('round-status')).toBeNull();
    expect(within(result).getByTestId('active-issue-title').textContent).toBe('Login page');
    expect(within(result).getByTestId('seat-table-title').textContent).toBe('AUFGEDECKT');
    expect(screen.getAllByTestId('seat-table')).toHaveLength(1);
    expect(screen.getAllByTestId('active-issue')).toHaveLength(1);
  });

  it.each([
    {
      name: 'the scrum master in DISCUSSION',
      snapshot: discussionScrumMaster,
      part: 'round-start',
    },
    { name: 'the scrum master in VOTING', snapshot: votingScrumMaster, part: 'round-reveal' },
    { name: 'a developer in DISCUSSION', snapshot: discussionDeveloper, part: 'card-deck-locked' },
    { name: 'a developer in VOTING', snapshot: votingDeveloper, part: 'card-deck' },
    {
      name: 'a viewer in DISCUSSION',
      snapshot: asViewer(discussionDeveloper),
      part: 'viewer-hint',
    },
    { name: 'a viewer in VOTING', snapshot: asViewer(votingDeveloper), part: 'viewer-hint' },
    { name: 'the scrum master in REVEALED', snapshot: revealedScrumMaster, part: 'result-accept' },
    { name: 'a developer in REVEALED', snapshot: revealedDeveloper, part: 'result-waiting' },
    {
      name: 'a viewer in REVEALED',
      snapshot: asViewer(revealedDeveloper),
      part: 'result-waiting',
    },
  ])(
    'shows the footer with $part as the last row of the room for $name',
    async ({ snapshot, part }) => {
      const { room } = await showRoom(snapshot);

      const footer = screen.getByTestId('round-footer');
      expect(room.lastElementChild?.contains(footer)).toBe(true);
      expect(room.lastElementChild).not.toBe(within(room).getByTestId('room-main'));
      expect(within(room).getByTestId('room-main').contains(footer)).toBe(false);
      expect(within(footer).getByTestId(part)).toBeTruthy();
    },
  );

  it.each([
    { name: 'the scrum master in LOBBY', snapshot: lobbyScrumMaster },
    { name: 'a developer in LOBBY', snapshot: lobbyDeveloper },
  ])('shows no footer for $name', async ({ snapshot }) => {
    const { room } = await showRoom(snapshot);

    expect(screen.queryByTestId('round-footer')).toBeNull();
    expect(room.children).toHaveLength(2);
  });

  it('replaces the deck by the waiting text when the round is revealed', async () => {
    const test = await showRoom(votingDeveloper);
    expect(screen.queryByTestId('card-deck')).not.toBeNull();

    receive(test, revealedDeveloper);

    expect(screen.queryByTestId('card-deck')).toBeNull();
    expect(screen.getByTestId('result-waiting').textContent).toBe(
      'Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.',
    );
  });

  it.each([
    { name: 'a developer', snapshot: lobbyDeveloper, last: 'session-facts' },
    {
      name: 'a developer with one revealed round',
      snapshot: withHistory(lobbyDeveloper, unconfirmedEntry()),
      last: 'history-panel',
    },
    {
      name: 'the scrum master with a confirmed round',
      snapshot: withHistory(lobbyScrumMaster, confirmedEntry()),
      last: 'history-panel',
    },
  ])('ends the side column with $last for $name', async ({ snapshot, last }) => {
    const { room } = await showRoom(snapshot);

    const side = within(room).getByTestId('room-side');
    expect(side.lastElementChild?.getAttribute('data-testid')).toBe(last);
    expect(screen.queryAllByTestId('history-panel')).toHaveLength(last === 'history-panel' ? 1 : 0);
  });

  it('shows the message of a confirmed result to the scrum master and closes the dialog', async () => {
    installPopupAnimations();
    installResizeObserver();
    const user = userEvent.setup();
    await showRoom(revealedScrumMaster);

    await user.click(screen.getByTestId('result-accept'));
    await user.click(await screen.findByRole('radio', { name: '8', hidden: true }));
    await user.click(screen.getByTestId('confirm-submit'));

    const message = await screen.findByTestId('confirm-success');
    expect(message.textContent).toBe('✓ Endwert 8 in GitLab-Issue #42 gespeichert.');
    const open = screen.getByTestId('confirm-success-open');
    expect(open.textContent).toBe('Öffnen');
    expect(open.getAttribute('href')).toBe(revealedScrumMaster.activeIssue?.webUrl);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
  });

  it.each([
    { name: 'a developer', snapshot: lobbyDeveloper },
    { name: 'a viewer', snapshot: asViewer(lobbyDeveloper) },
    { name: 'a developer in VOTING', snapshot: votingDeveloper },
    { name: 'a viewer in REVEALED', snapshot: asViewer(revealedDeveloper) },
  ])('shows no issue panel and loads no issues for $name', async ({ snapshot }) => {
    const { calls } = await showRoom(snapshot);

    expect(screen.queryByTestId('issue-panel')).toBeNull();
    expect(screen.queryByTestId('issue-release')).toBeNull();
    expect(calls.filter(isIssueList)).toHaveLength(0);
  });

  it('shows the active issue of the snapshot with its title', async () => {
    const test = await showRoom(lobbyDeveloper);
    expect(screen.queryByTestId('active-issue')).toBeNull();

    receive(test, discussionDeveloper);

    expect(screen.getByTestId('active-issue-title').textContent).toBe('Login page');
    expect(screen.getByTestId('active-issue-iid').textContent).toBe('#42');
  });

  it('removes the waiting state with the release of an issue', async () => {
    const test = await showRoom(lobbyDeveloper);
    expect(screen.queryByTestId('lobby-waiting')).not.toBeNull();

    receive(test, discussionDeveloper);

    expect(screen.queryByTestId('lobby-waiting')).toBeNull();
  });
});
