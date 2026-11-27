import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-error';
import { motifFor } from '../api/card-motif';
import { lobbyDeveloper, lobbyScrumMaster, votingDeveloper } from '../api/examples';
import type { SessionView } from '../api/examples';
import { createTestBackend, renderWithBackend } from '../api/testing/test-backend';
import type { Answer } from '../api/testing/test-backend';
import { AppShell } from './app-shell';
import { createThemeStore } from './theme-store';

const lobbyViewer: SessionView = {
  ...lobbyDeveloper,
  me: { ...lobbyDeveloper.me, role: 'VIEWER' },
  participants: lobbyDeveloper.participants.map((participant) =>
    participant.id === lobbyDeveloper.me.participantId
      ? { ...participant, role: 'VIEWER' }
      : participant,
  ),
};

const DEMO_HINT =
  'Demo-Modus: Projekte und Issues sind Beispiele. Ergebnisse gehen nicht an GitLab.';

function renderShell(
  systemDark: boolean,
  path = '/',
  snapshot: SessionView | null = null,
  answer: Answer = () => Response.json(snapshot),
) {
  vi.stubGlobal('matchMedia', () => ({ matches: systemDark, addEventListener: () => undefined }));
  const { backend, sockets } = createTestBackend(answer);
  const theme = createThemeStore(window, backend.preferences);
  theme.start();
  renderWithBackend(
    <Routes>
      <Route element={<AppShell theme={theme} />}>
        <Route index element={<p>Seite</p>} />
        <Route path="*" element={<p>Andere Seite</p>} />
      </Route>
    </Routes>,
    backend,
    path,
  );
  return { toggle: screen.getByTestId('theme-toggle'), backend, sockets };
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the title as a link to the start page and the page in the main area', () => {
    renderShell(false);

    const home = screen.getByTestId('toolbar-home');
    expect(home.textContent).toBe('Planning Poker');
    expect(home.getAttribute('href')).toBe('/');
    expect(screen.getByRole('main').textContent).toBe('Seite');
  });

  it.each([
    { systemDark: false, label: 'Dunkles Design', symbol: '🌙', pressed: 'false' },
    { systemDark: true, label: 'Helles Design', symbol: '☀️', pressed: 'true' },
  ])(
    'labels the toggle $label with a system scheme with dark $systemDark',
    ({ systemDark, label, symbol, pressed }) => {
      const { toggle } = renderShell(systemDark);

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('data-slot')).toBe('toggle');
      expect(toggle.getAttribute('aria-label')).toBe(label);
      expect(toggle.getAttribute('aria-pressed')).toBe(pressed);
      expect(toggle.textContent).toBe(symbol);
      const span = toggle.querySelector('.app-symbol');
      expect(span?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('switches label, symbol, aria-pressed and data-theme with a click and back with the keyboard', async () => {
    const user = userEvent.setup();
    const { toggle } = renderShell(false);

    await user.click(toggle);

    expect(toggle.getAttribute('aria-label')).toBe('Helles Design');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toBe('☀️');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    toggle.focus();
    await user.keyboard('{Enter}');

    expect(toggle.getAttribute('aria-label')).toBe('Dunkles Design');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('shows the error banner between the toolbar and the main area', () => {
    const { backend } = renderShell(false);
    expect(screen.queryByTestId('error-banner')).toBeNull();

    act(() => backend.errors.report(new ApiError('NAME_TAKEN', 409)));

    const banner = screen.getByTestId('error-banner');
    expect(screen.getByTestId('toolbar').nextElementSibling).toBe(banner);
    expect(banner.nextElementSibling).toBe(screen.getByRole('main'));
  });

  it.each([
    { name: 'the start page', path: '/' },
    { name: 'the join page', path: '/session/K7P2QX9M/join?invite=code' },
  ])('shows the demo hint under the toolbar on $name for demo true', async ({ path }) => {
    const { backend } = renderShell(false, path, null, () =>
      Response.json({ rememberSessions: true, demo: true }),
    );
    expect(screen.queryByTestId('demo-hint')).toBeNull();

    await act(() => backend.loadSetting());

    const hint = screen.getByTestId('demo-hint');
    expect(hint.textContent).toBe(DEMO_HINT);
    expect(hint.getAttribute('role')).toBe('status');
    expect(screen.getByTestId('toolbar').nextElementSibling).toBe(hint);
    expect(hint.nextElementSibling).toBe(screen.getByRole('main'));
  });

  it('shows the demo hint between the toolbar and the error banner in the room', async () => {
    const { backend } = renderShell(false, '/', lobbyScrumMaster, (call) =>
      call.url === '/api/config'
        ? Response.json({ rememberSessions: true, demo: true })
        : Response.json(lobbyScrumMaster),
    );
    backend.tokens.store(lobbyScrumMaster.sessionId, {
      participantId: lobbyScrumMaster.me.participantId,
      token: 'token-of-me',
    });
    await act(() => backend.loadSetting());
    act(() => backend.sessions.enter(lobbyScrumMaster.sessionId));
    await waitFor(() => expect(backend.sessions.session()).not.toBeNull());
    act(() => backend.errors.report(new ApiError('NAME_TAKEN', 409)));

    const hint = screen.getByTestId('demo-hint');
    expect(hint.textContent).toBe(DEMO_HINT);
    expect(screen.getByTestId('toolbar').nextElementSibling).toBe(hint);
    expect(hint.nextElementSibling).toBe(screen.getByTestId('error-banner'));
  });

  it.each([
    { name: 'demo false', answer: () => Response.json({ rememberSessions: true, demo: false }) },
    { name: 'an answer without the field', answer: () => Response.json({}) },
    { name: 'an answer 500', answer: () => new Response(null, { status: 500 }) },
    { name: 'a network failure', answer: () => Promise.reject(new TypeError('Failed to fetch')) },
  ])('shows no demo hint after $name of GET /api/config', async ({ answer }) => {
    const { backend } = renderShell(false, '/', null, answer);

    await act(() => backend.loadSetting());

    expect(screen.queryByTestId('demo-hint')).toBeNull();
  });

  it('shows no motif field, no session id and no name on the start page', () => {
    renderShell(false);

    expect(screen.queryByTestId('toolbar-motif')).toBeNull();
    expect(screen.queryByTestId('toolbar-session-id')).toBeNull();
    expect(screen.queryByTestId('toolbar-me')).toBeNull();
  });

  it.each([
    { path: '/session/K7P2QX9M/join?invite=code', id: 'K7P2QX9M' },
    { path: '/session/k7p2qx9m/join', id: 'K7P2QX9M' },
  ])('shows the motif field and the session id $id on the join page $path', ({ path, id }) => {
    renderShell(false, path);

    const toolbar = screen.getByTestId('toolbar');
    const motif = screen.getByTestId('toolbar-motif');
    const home = screen.getByTestId('toolbar-home');
    const sessionId = screen.getByTestId('toolbar-session-id');
    expect(motif.getAttribute('aria-hidden')).toBe('true');
    expect(motif.textContent).toBe('');
    expect(motif.hasAttribute('data-filled')).toBe(false);
    expect(motif.className).not.toMatch(/motif-\d/);
    expect(toolbar.firstElementChild).toBe(motif);
    expect(motif.nextElementSibling).toBe(home);
    expect(home.nextElementSibling).toBe(sessionId);
    expect(sessionId.textContent).toBe(id);
    expect(screen.queryByTestId('toolbar-me')).toBeNull();
    expect(toolbar.lastElementChild).toBe(screen.getByTestId('theme-toggle'));
  });

  it.each([
    { name: 'seven characters', path: '/session/K7P2QX9/join' },
    { name: 'nine characters', path: '/session/K7P2QX9MA/join' },
    { name: 'a character outside the alphabet', path: '/session/K7P2QX1M/join' },
    { name: 'the room path', path: '/session/K7P2QX9M' },
    { name: 'a longer path', path: '/session/K7P2QX9M/join/more' },
  ])('shows no session id for $name', ({ path }) => {
    renderShell(false, path);

    expect(screen.queryByTestId('toolbar-motif')).toBeNull();
    expect(screen.queryByTestId('toolbar-session-id')).toBeNull();
    expect(screen.queryByTestId('toolbar-me')).toBeNull();
  });

  it.each([
    { snapshot: lobbyScrumMaster, me: 'Anna · Scrum Master' },
    { snapshot: lobbyDeveloper, me: 'Ben · Entwickler' },
    { snapshot: lobbyViewer, me: 'Ben · Zuschauer' },
  ])('shows the session of the snapshot and „$me“ in the room', async ({ snapshot, me }) => {
    const { backend } = renderShell(false, '/', snapshot);
    backend.tokens.store(snapshot.sessionId, {
      participantId: snapshot.me.participantId,
      token: 'token-of-me',
    });

    act(() => backend.sessions.enter(snapshot.sessionId));
    await waitFor(() => expect(backend.sessions.session()).not.toBeNull());

    const toolbar = screen.getByTestId('toolbar');
    expect(toolbar.firstElementChild).toBe(screen.getByTestId('toolbar-motif'));
    expect(screen.getByTestId('toolbar-session-id').textContent).toBe(snapshot.sessionId);
    expect(screen.getByTestId('toolbar-me').textContent).toBe(me);
    expect(toolbar.lastElementChild).toBe(screen.getByTestId('theme-toggle'));

    act(() => backend.sessions.leave());

    expect(screen.queryByTestId('toolbar-motif')).toBeNull();
    expect(screen.queryByTestId('toolbar-session-id')).toBeNull();
    expect(screen.queryByTestId('toolbar-me')).toBeNull();
  });

  it('fills the motif field with the motif of the lobby and then of the round', async () => {
    const { backend, sockets } = renderShell(false, '/', lobbyDeveloper);
    backend.tokens.store(lobbyDeveloper.sessionId, {
      participantId: lobbyDeveloper.me.participantId,
      token: 'token-of-me',
    });

    act(() => backend.sessions.enter(lobbyDeveloper.sessionId));
    await waitFor(() => expect(sockets.sockets.length).toBe(1));

    const motif = screen.getByTestId('toolbar-motif');
    expect(motif.getAttribute('data-filled')).toBe('true');
    expect(motif.classList.contains('motif-0')).toBe(true);
    expect(motif.getAttribute('aria-hidden')).toBe('true');

    const round: SessionView = {
      ...votingDeveloper,
      round: votingDeveloper.round === null ? null : { ...votingDeveloper.round, number: 3 },
    };
    const expected = motifFor(round.sessionId, round.activeIssue?.iid ?? 0, 3);
    expect(round.round?.number).toBe(3);
    act(() => sockets.last().receive({ type: 'session.state', payload: round }));

    const classes = [...screen.getByTestId('toolbar-motif').classList];
    expect(classes.filter((name) => /^motif-\d$/.test(name))).toEqual([`motif-${expected}`]);
  });

  it('shows no name when the own participant is not in the list', async () => {
    const snapshot: SessionView = {
      ...lobbyDeveloper,
      participants: lobbyDeveloper.participants.filter(
        (participant) => participant.id !== lobbyDeveloper.me.participantId,
      ),
    };
    const { backend } = renderShell(false, '/', snapshot);
    backend.tokens.store(snapshot.sessionId, {
      participantId: snapshot.me.participantId,
      token: 'token-of-me',
    });

    act(() => backend.sessions.enter(snapshot.sessionId));
    await waitFor(() => expect(backend.sessions.session()).not.toBeNull());

    expect(screen.getByTestId('toolbar-session-id').textContent).toBe(snapshot.sessionId);
    expect(screen.queryByTestId('toolbar-me')).toBeNull();
  });
});
