import { act, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLastError } from '../api/backend';
import { lobbyScrumMaster } from '../api/examples';
import { RequireSession } from '../api/require-session';
import { createTestBackend, problem, renderWithBackend } from '../api/testing/test-backend';
import type { Answer } from '../api/testing/test-backend';
import { SessionPage } from './session-page';

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
});
