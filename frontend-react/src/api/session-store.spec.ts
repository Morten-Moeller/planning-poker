import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from './api';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  votingDeveloper,
  votingScrumMaster,
} from './examples';
import { createTestBackend, problem } from './testing/test-backend';
import type { Answer } from './testing/test-backend';

const ID = lobbyScrumMaster.sessionId;
const IDENTITY = { participantId: lobbyScrumMaster.me.participantId, token: 'token-of-anna' };
const NOW = Date.parse('2026-11-24T10:00:00.000Z');

const EXAMPLES: { name: string; view: SessionView }[] = [
  { name: 'lobby of the scrum master', view: lobbyScrumMaster },
  { name: 'lobby of a developer', view: lobbyDeveloper },
  { name: 'discussion of the scrum master', view: discussionScrumMaster },
  { name: 'discussion of a developer', view: discussionDeveloper },
  { name: 'voting of the scrum master', view: votingScrumMaster },
  { name: 'voting of a developer', view: votingDeveloper },
  { name: 'result of the scrum master', view: revealedScrumMaster },
  { name: 'result of a developer', view: revealedDeveloper },
];

function setup(answer: Answer = () => Response.json(lobbyScrumMaster)) {
  const test = createTestBackend(answer);
  test.backend.tokens.store(ID, IDENTITY);
  const changes = vi.fn();
  test.backend.sessions.subscribe(changes);
  return { ...test, sessions: test.backend.sessions, changes };
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the session with the token, takes the answer and connects with the token', async () => {
    const { sessions, calls, sockets, changes } = setup();
    expect(sessions.session()).toBeNull();

    sessions.enter(ID);
    expect(sessions.session()).toBeNull();
    await settle();

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([`GET /api/sessions/${ID}`]);
    expect(calls[0]?.headers['Authorization']).toBe('Bearer token-of-anna');
    expect(sessions.session()).toEqual(lobbyScrumMaster);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(sockets.last().url).toContain(`/ws/sessions/${ID}`);
    sockets.last().open();
    expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: 'token-of-anna' } }]);
  });

  it.each(EXAMPLES)('replaces the whole snapshot with the $name', async ({ view }) => {
    const { sessions, sockets } = setup(() => Response.json(revealedScrumMaster));
    sessions.enter(ID);
    await settle();

    sockets.last().receive({ type: 'session.state', payload: view });

    expect(sessions.session()).toEqual(view);
  });

  it('does nothing without a stored token', async () => {
    const { backend, calls, sockets } = createTestBackend(() => Response.json(lobbyScrumMaster));

    backend.sessions.enter(ID);
    await settle();

    expect(calls).toEqual([]);
    expect(sockets.sockets).toEqual([]);
    expect(backend.sessions.session()).toBeNull();
  });

  it('sets the snapshot to null and ends the connection with leave', async () => {
    const { sessions, sockets } = setup();
    sessions.enter(ID);
    await settle();
    const socket = sockets.last();

    sessions.leave();
    socket.receive({ type: 'session.state', payload: votingScrumMaster });

    expect(sessions.session()).toBeNull();
    expect(socket.closed()).toBe(true);
  });

  it('takes no answer and opens no connection after leave during the load', async () => {
    const { sessions, sockets } = setup();
    sessions.enter(ID);

    sessions.leave();
    await settle();

    expect(sessions.session()).toBeNull();
    expect(sockets.sockets).toEqual([]);
  });

  it.each<{ name: string; answer: Answer }>([
    { name: 'a problem', answer: () => problem(404, 'SESSION_NOT_FOUND') },
    { name: 'a network failure', answer: () => Promise.reject(new TypeError('Failed to fetch')) },
  ])('keeps the snapshot null and opens no connection after $name', async ({ answer }) => {
    const { sessions, sockets } = setup(answer);

    sessions.enter(ID);
    await settle();

    expect(sessions.session()).toBeNull();
    expect(sockets.sockets).toEqual([]);
  });

  it('sets the snapshot to null when the connection ends with a message error', async () => {
    const { backend, sessions, sockets } = setup();
    sessions.enter(ID);
    await settle();

    sockets.last().receive({
      type: 'error',
      payload: { errorCode: 'UNAUTHORIZED', detail: 'Unknown token.' },
    });

    expect(sessions.session()).toBeNull();
    expect(backend.errors.error()?.errorCode).toBe('UNAUTHORIZED');
  });

  it('keeps the snapshot while the connection is lost and takes the snapshot after it', async () => {
    const { sessions, sockets } = setup();
    sessions.enter(ID);
    await settle();

    sockets.last().drop();
    expect(sessions.session()).toEqual(lobbyScrumMaster);
    await vi.advanceTimersByTimeAsync(1_000);
    sockets.last().receive({ type: 'session.state', payload: votingScrumMaster });

    expect(sessions.session()).toEqual(votingScrumMaster);
  });

  it('leaves the first session when it enters a second one', async () => {
    const { backend, sessions, sockets } = setup();
    backend.tokens.store('ABCDEFGH', IDENTITY);
    sessions.enter(ID);
    await settle();
    const first = sockets.last();

    sessions.enter('ABCDEFGH');
    expect(sessions.session()).toBeNull();
    await settle();

    expect(first.closed()).toBe(true);
    expect(sockets.last().url).toContain('/ws/sessions/ABCDEFGH');
  });

  describe('serverNow', () => {
    it('is the client clock before the first snapshot', () => {
      const { sessions } = setup();

      expect(sessions.serverNow()).toBe(NOW);
    });

    it.each([
      { name: 'a server 90 s ahead', offset: 90_000 },
      { name: 'a server 5 s behind', offset: -5_000 },
    ])('adds the distance to serverTime for $name', async ({ offset }) => {
      const view = { ...lobbyScrumMaster, serverTime: new Date(NOW + offset).toISOString() };
      const { sessions } = setup(() => Response.json(view));
      sessions.enter(ID);
      await settle();

      expect(sessions.serverNow()).toBe(NOW + offset);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(sessions.serverNow()).toBe(NOW + offset + 2_000);
    });

    it('takes the distance of the last snapshot', async () => {
      const { sessions, sockets } = setup();
      sessions.enter(ID);
      await settle();

      sockets.last().receive({
        type: 'session.state',
        payload: { ...lobbyScrumMaster, serverTime: new Date(NOW + 7_000).toISOString() },
      });

      expect(sessions.serverNow()).toBe(NOW + 7_000);
    });

    it('has the distance 0 for a serverTime that is no date', async () => {
      const { sessions, sockets } = setup();
      sessions.enter(ID);
      await settle();

      sockets.last().receive({
        type: 'session.state',
        payload: { ...lobbyScrumMaster, serverTime: 'not a time' },
      });

      expect(sessions.serverNow()).toBe(NOW);
    });
  });
});
