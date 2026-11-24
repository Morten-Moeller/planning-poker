import { act, screen, waitFor, within } from '@testing-library/react';
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
import { motifFor } from './card-motif';
import { SessionPage } from './session-page';
import {
  asViewer,
  confirmedEntry,
  inRound,
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
  const test = setup(() => Response.json(snapshot));
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
    const { backend, calls, sockets } = setup(() => Response.json(lobbyScrumMaster));

    expect(screen.getByTestId('session-loading').textContent).toBe('Sitzung wird geladen');
    await waitFor(() => expect(backend.sessions.session()).toEqual(lobbyScrumMaster));

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([`GET /api/sessions/${ID}`]);
    expect(calls[0]?.headers['Authorization']).toBe('Bearer token-of-anna');
    expect(sockets.sockets).toHaveLength(1);
    expect(screen.queryByTestId('session-gone')).toBeNull();
  });

  it('leaves the session when the page is left', async () => {
    const { backend, sockets, unmount } = setup(() => Response.json(lobbyScrumMaster));
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
    const test = setup(() => Response.json(lobbyScrumMaster));
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
    const test = setup(() => Response.json(lobbyScrumMaster));
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

  it.each([
    { name: 'the scrum master in LOBBY', snapshot: lobbyScrumMaster },
    {
      name: 'the scrum master in LOBBY after a confirmation',
      snapshot: withHistory(lobbyScrumMaster, confirmedEntry()),
    },
    { name: 'a developer in DISCUSSION', snapshot: discussionDeveloper },
    { name: 'a developer in VOTING', snapshot: votingDeveloper },
    { name: 'a viewer in VOTING', snapshot: asViewer(votingDeveloper) },
    { name: 'a developer in REVEALED', snapshot: revealedDeveloper },
    { name: 'the scrum master in REVEALED', snapshot: revealedScrumMaster },
  ])('leaves the main area empty for $name', async ({ snapshot }) => {
    const { room } = await showRoom(snapshot);

    expect(within(room).getByTestId('room-main').children).toHaveLength(0);
    expect(screen.queryByTestId('lobby-waiting')).toBeNull();
    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  it('removes the waiting state with the release of an issue', async () => {
    const test = await showRoom(lobbyDeveloper);
    expect(screen.queryByTestId('lobby-waiting')).not.toBeNull();

    receive(test, discussionDeveloper);

    expect(screen.queryByTestId('lobby-waiting')).toBeNull();
  });
});
