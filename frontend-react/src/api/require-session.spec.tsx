import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequireSession } from './require-session';
import { createTestBackend, renderWithBackend } from './testing/test-backend';
import type { Backend } from './backend';

const ID = 'K7P2QX9M';
const IDENTITY = { participantId: 'p-1', token: 'token-of-anna' };

function Path() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderRoute(backend: Backend, path: string) {
  renderWithBackend(
    <Routes>
      <Route
        path="session/:id"
        element={
          <RequireSession>
            <p data-testid="room">Raum</p>
          </RequireSession>
        }
      />
      <Route path="*" element={<Path />} />
    </Routes>,
    backend,
    path,
  );
}

describe('RequireSession', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows the route with a stored token for the session', () => {
    const { backend } = createTestBackend();
    backend.tokens.store(ID, IDENTITY);

    renderRoute(backend, `/session/${ID}`);

    expect(screen.getByTestId('room')).toBeTruthy();
  });

  it.each([
    { name: 'no stored token', storedFor: null },
    { name: 'a token for another session', storedFor: 'ABCDEFGH' },
  ])('leads to the join page of the session with $name', ({ storedFor }) => {
    const { backend } = createTestBackend();
    if (storedFor !== null) {
      backend.tokens.store(storedFor, IDENTITY);
    }

    renderRoute(backend, `/session/${ID}`);

    expect(screen.queryByTestId('room')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe(`/session/${ID}/join`);
  });

  it('shows the route with an entry of the recent sessions and copies the token', async () => {
    const { backend } = createTestBackend(() => Response.json({ rememberSessions: true }));
    await backend.loadSetting();
    backend.tokens.store(ID, IDENTITY, { role: 'DEVELOPER', name: 'Ben' });
    sessionStorage.clear();

    renderRoute(backend, `/session/${ID}`);

    expect(screen.getByTestId('room')).toBeTruthy();
    expect(sessionStorage.getItem(`planningpoker.session.${ID}`)).not.toBeNull();
  });
});
