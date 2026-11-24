import { beforeEach, describe, expect, it } from 'vitest';
import { RECENT_SESSIONS_KEY } from './recent-sessions';
import { createTestBackend } from './testing/test-backend';
import type { Backend } from './backend';

const ID = 'K7P2QX9M';
const KEY = `planningpoker.session.${ID}`;
const IDENTITY = { participantId: 'p-1', token: 'token-of-anna' };
const DETAILS = { role: 'SCRUM_MASTER', name: 'Anna' } as const;

async function backendWithSetting(rememberSessions: boolean | null): Promise<Backend> {
  const { backend } = createTestBackend(() =>
    rememberSessions === null
      ? new Response(null, { status: 500 })
      : Response.json({ rememberSessions }),
  );
  await backend.loadSetting();
  expect(backend.recent.enabled()).toBe(rememberSessions);
  return backend;
}

function storedRecent(): unknown {
  return JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) ?? 'null');
}

describe('token store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('store', () => {
    it('writes participant id and token into sessionStorage under the key of the session', async () => {
      const { tokens } = await backendWithSetting(true);

      tokens.store(ID, { ...IDENTITY, other: 'value' } as typeof IDENTITY);

      expect(JSON.parse(sessionStorage.getItem(KEY) ?? 'null')).toEqual(IDENTITY);
      expect(tokens.identity(ID)).toEqual(IDENTITY);
    });

    it('writes the entry of the recent sessions with role, name and the time of the clock', async () => {
      const { tokens } = await backendWithSetting(true);
      const before = Date.now();

      tokens.store(ID, IDENTITY, DETAILS);

      const entries = storedRecent() as { lastUsedAt: string }[];
      expect(entries).toEqual([
        { sessionId: ID, ...IDENTITY, ...DETAILS, lastUsedAt: expect.any(String) as string },
      ]);
      expect(Date.parse(entries[0]?.lastUsedAt ?? '')).toBeGreaterThanOrEqual(before);
    });

    it.each([
      { name: 'enabled true and no details', setting: true, details: undefined },
      { name: 'enabled false and details', setting: false, details: DETAILS },
      { name: 'enabled null and details', setting: null, details: DETAILS },
    ])('writes no entry of the recent sessions with $name', async ({ setting, details }) => {
      const { tokens } = await backendWithSetting(setting);

      tokens.store(ID, IDENTITY, details);

      expect(sessionStorage.getItem(KEY)).not.toBeNull();
      expect(storedRecent()).toBeNull();
    });
  });

  describe('identity', () => {
    it('is null without a stored value', async () => {
      const { tokens } = await backendWithSetting(true);

      expect(tokens.identity(ID)).toBeNull();
    });

    it.each([
      { name: 'invalid JSON', value: '{not json' },
      { name: 'a value without a token', value: JSON.stringify({ participantId: 'p-1' }) },
      {
        name: 'a token that is no text',
        value: JSON.stringify({ participantId: 'p-1', token: 7 }),
      },
      { name: 'null', value: 'null' },
    ])('is null with $name in sessionStorage', async ({ value }) => {
      const { tokens } = await backendWithSetting(false);
      sessionStorage.setItem(KEY, value);

      expect(tokens.identity(ID)).toBeNull();
    });

    it('falls back to the entry of the recent sessions and copies it into sessionStorage', async () => {
      const first = await backendWithSetting(true);
      first.tokens.store(ID, IDENTITY, DETAILS);
      sessionStorage.clear();
      const { tokens } = await backendWithSetting(true);

      expect(tokens.identity(ID)).toEqual(IDENTITY);
      expect(JSON.parse(sessionStorage.getItem(KEY) ?? 'null')).toEqual(IDENTITY);
    });

    it.each([false, null])('does not read the recent sessions with enabled %s', async (setting) => {
      const first = await backendWithSetting(true);
      first.tokens.store(ID, IDENTITY, DETAILS);
      sessionStorage.clear();
      const { tokens } = await backendWithSetting(setting);

      expect(tokens.identity(ID)).toBeNull();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('prefers the value in sessionStorage over the entry of the recent sessions', async () => {
      const { tokens } = await backendWithSetting(true);
      tokens.store(ID, IDENTITY, DETAILS);
      sessionStorage.setItem(KEY, JSON.stringify({ participantId: 'p-2', token: 'token-of-ben' }));

      expect(tokens.identity(ID)).toEqual({ participantId: 'p-2', token: 'token-of-ben' });
    });
  });

  it('removes the value in sessionStorage and the entry of the recent sessions', async () => {
    const { tokens } = await backendWithSetting(true);
    tokens.store(ID, IDENTITY, DETAILS);
    tokens.store('ABCDEFGH', IDENTITY, DETAILS);

    tokens.remove(ID);

    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(tokens.identity(ID)).toBeNull();
    expect((storedRecent() as { sessionId: string }[]).map((entry) => entry.sessionId)).toEqual([
      'ABCDEFGH',
    ]);
  });
});
