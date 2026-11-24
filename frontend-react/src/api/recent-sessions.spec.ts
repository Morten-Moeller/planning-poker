import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECENT_SESSIONS_KEY, createRecentSessions } from './recent-sessions';
import type { RecentSession } from './recent-sessions';
import { createTestBackend, problem } from './testing/test-backend';

function entry(sessionId: string, changes: Partial<RecentSession> = {}): RecentSession {
  return {
    sessionId,
    participantId: `participant-${sessionId}`,
    token: `token-${sessionId}`,
    role: 'DEVELOPER',
    name: 'Ben',
    lastUsedAt: '2026-11-24T10:00:00.000Z',
    ...changes,
  };
}

function denied(): Storage {
  throw new Error('denied');
}

function createList() {
  return createRecentSessions(() => localStorage, setTimeout);
}

function ids(entries: RecentSession[]): string[] {
  return entries.map((item) => item.sessionId);
}

describe('recent sessions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('list', () => {
    it('is empty without a stored value', () => {
      expect(createList().list()).toEqual([]);
    });

    it('puts the newest entry first under the key of the Angular frontend', () => {
      const recent = createList();

      recent.save(entry('AAAAAAAA'));
      recent.save(entry('BBBBBBBB', { role: 'SCRUM_MASTER', name: 'Anna' }));

      expect(ids(recent.list())).toEqual(['BBBBBBBB', 'AAAAAAAA']);
      expect(JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) ?? 'null')).toEqual([
        entry('BBBBBBBB', { role: 'SCRUM_MASTER', name: 'Anna' }),
        entry('AAAAAAAA'),
      ]);
      expect(RECENT_SESSIONS_KEY).toBe('planningpoker.recent-sessions');
    });

    it('moves an entry that is saved again to the front and replaces its values', () => {
      const recent = createList();
      recent.save(entry('AAAAAAAA'));
      recent.save(entry('BBBBBBBB'));

      recent.save(entry('AAAAAAAA', { lastUsedAt: '2026-11-24T11:00:00.000Z' }));

      expect(recent.list()).toEqual([
        entry('AAAAAAAA', { lastUsedAt: '2026-11-24T11:00:00.000Z' }),
        entry('BBBBBBBB'),
      ]);
    });

    it('keeps at most five entries and drops the oldest', () => {
      const recent = createList();

      for (const id of ['AAAAAAAA', 'BBBBBBBB', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE', 'FFFFFFFF']) {
        recent.save(entry(id));
      }

      expect(ids(recent.list())).toEqual([
        'FFFFFFFF',
        'EEEEEEEE',
        'DDDDDDDD',
        'CCCCCCCC',
        'BBBBBBBB',
      ]);
    });

    it('reads at most five entries of a longer stored list', () => {
      const stored = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => entry(letter.repeat(8)));
      localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(stored));

      expect(createList().list()).toHaveLength(5);
    });

    it('reads only the fields of an entry', () => {
      localStorage.setItem(
        RECENT_SESSIONS_KEY,
        JSON.stringify([{ ...entry('AAAAAAAA'), other: 'value' }]),
      );

      expect(createList().list()).toEqual([entry('AAAAAAAA')]);
    });

    it.each([
      { name: 'invalid JSON', value: '{not json' },
      { name: 'a value that is no list', value: JSON.stringify({ sessionId: 'AAAAAAAA' }) },
      { name: 'an entry that is no object', value: JSON.stringify([entry('AAAAAAAA'), 7]) },
      { name: 'an entry that is null', value: JSON.stringify([null]) },
      {
        name: 'an entry without a token',
        value: JSON.stringify([{ ...entry('AAAAAAAA'), token: undefined }]),
      },
      {
        name: 'an entry with an unknown role',
        value: JSON.stringify([entry('AAAAAAAA'), { ...entry('BBBBBBBB'), role: 'ADMIN' }]),
      },
      {
        name: 'an entry with a time that is no date',
        value: JSON.stringify([entry('AAAAAAAA', { lastUsedAt: 'yesterday' })]),
      },
      {
        name: 'an entry with a name that is no text',
        value: JSON.stringify([{ ...entry('AAAAAAAA'), name: 7 }]),
      },
    ])('is empty with $name in the storage', ({ value }) => {
      localStorage.setItem(RECENT_SESSIONS_KEY, value);

      expect(createList().list()).toEqual([]);
    });

    it('is empty and saves nothing when localStorage throws', () => {
      const recent = createRecentSessions(denied, setTimeout);

      expect(recent.list()).toEqual([]);
      expect(recent.find('AAAAAAAA')).toBeNull();
      expect(() => recent.save(entry('AAAAAAAA'))).not.toThrow();
      expect(() => recent.remove('AAAAAAAA')).not.toThrow();
      expect(() => recent.clear()).not.toThrow();
    });

    it('finds an entry by its session id', () => {
      const recent = createList();
      recent.save(entry('AAAAAAAA'));

      expect(recent.find('AAAAAAAA')).toEqual(entry('AAAAAAAA'));
      expect(recent.find('BBBBBBBB')).toBeNull();
    });

    it('removes one entry and clears the list', () => {
      const recent = createList();
      recent.save(entry('AAAAAAAA'));
      recent.save(entry('BBBBBBBB'));

      recent.remove('AAAAAAAA');
      expect(ids(recent.list())).toEqual(['BBBBBBBB']);

      recent.clear();
      expect(localStorage.getItem(RECENT_SESSIONS_KEY)).toBeNull();
    });
  });

  describe('loadSetting', () => {
    it('is null before the setting is loaded', () => {
      expect(createTestBackend().backend.recent.enabled()).toBeNull();
    });

    it.each([true, false])('sets enabled to %s from GET /api/config', async (rememberSessions) => {
      const { backend, calls } = createTestBackend(() => Response.json({ rememberSessions }));

      await backend.loadSetting();

      expect(backend.recent.enabled()).toBe(rememberSessions);
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /api/config']);
    });

    it.each([
      { name: 'a problem with an errorCode', answer: () => problem(500, 'GITLAB_ERROR') },
      { name: 'an answer 500 without a body', answer: () => new Response(null, { status: 500 }) },
      { name: 'a network failure', answer: () => Promise.reject(new TypeError('Failed to fetch')) },
      { name: 'an answer 200 without the field', answer: () => Response.json({}) },
    ])('keeps enabled null after $name and reports no error', async ({ answer }) => {
      const { backend } = createTestBackend(answer);

      await backend.loadSetting();

      expect(backend.recent.enabled()).toBeNull();
      expect(backend.errors.error()).toBeNull();
    });

    it('ends after 3 s without an answer, keeps enabled null and ends the call', async () => {
      vi.useFakeTimers();
      let answer: (response: Response) => void = () => undefined;
      const { backend, calls } = createTestBackend(
        () => new Promise<Response>((resolve) => (answer = resolve)),
      );
      const done = vi.fn();

      void backend.loadSetting().then(done);
      await vi.advanceTimersByTimeAsync(2_999);
      expect(done).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(done).toHaveBeenCalledTimes(1);
      expect(calls[0]?.signal?.aborted).toBe(true);
      answer(Response.json({ rememberSessions: true }));
      await vi.advanceTimersByTimeAsync(0);
      expect(backend.recent.enabled()).toBeNull();
      expect(backend.errors.error()).toBeNull();
    });
  });
});
