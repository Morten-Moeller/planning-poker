import { TestBed } from '@angular/core/testing';
import { RECENT_SESSIONS_KEY, RecentSessions } from './recent-sessions';
import { TokenStore } from './token-store';

describe('TokenStore', () => {
  let tokens: TokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    tokens = TestBed.inject(TokenStore);
  });

  afterEach(() => localStorage.clear());

  it('returns null for a session without a stored identity', () => {
    expect(tokens.identity('K7P2QX9M')).toBeNull();
  });

  it('returns the stored token and participant id of the session', () => {
    tokens.store('K7P2QX9M', { participantId: 'p-anna', token: 'token-anna' });

    expect(tokens.identity('K7P2QX9M')).toEqual({ participantId: 'p-anna', token: 'token-anna' });
  });

  it('keeps the identities of two sessions apart', () => {
    tokens.store('K7P2QX9M', { participantId: 'p-anna', token: 'token-anna' });
    tokens.store('M3N4P5Q6', { participantId: 'p-ben', token: 'token-ben' });

    expect(tokens.identity('K7P2QX9M')?.token).toBe('token-anna');
    expect(tokens.identity('M3N4P5Q6')?.token).toBe('token-ben');
    tokens.remove('K7P2QX9M');
    expect(tokens.identity('K7P2QX9M')).toBeNull();
    expect(tokens.identity('M3N4P5Q6')?.token).toBe('token-ben');
  });

  it('stores the identity in sessionStorage under the key of the session', () => {
    tokens.store('K7P2QX9M', { participantId: 'p-anna', token: 'token-anna' });

    expect(JSON.parse(sessionStorage.getItem('planningpoker.session.K7P2QX9M') ?? '')).toEqual({
      participantId: 'p-anna',
      token: 'token-anna',
    });
  });

  it.each([['not json'], ['{"token":"only-token"}'], ['42']])(
    'returns null for the stored value %s',
    (raw) => {
      sessionStorage.setItem('planningpoker.session.K7P2QX9M', raw);

      expect(tokens.identity('K7P2QX9M')).toBeNull();
    },
  );

  describe('with the recent sessions switched on', () => {
    let recent: RecentSessions;

    beforeEach(() => {
      recent = TestBed.inject(RecentSessions);
      recent.enabled.set(true);
    });

    it('also writes the identity with role and name into the recent sessions', () => {
      tokens.store(
        'K7P2QX9M',
        { participantId: 'p-anna', token: 'token-anna' },
        { role: 'SCRUM_MASTER', name: 'Anna' },
      );

      expect(recent.list()).toEqual([
        {
          sessionId: 'K7P2QX9M',
          participantId: 'p-anna',
          token: 'token-anna',
          role: 'SCRUM_MASTER',
          name: 'Anna',
          lastUsedAt: expect.any(String),
        },
      ]);
    });

    it('returns the recent entry without sessionStorage and copies it there', () => {
      tokens.store(
        'K7P2QX9M',
        { participantId: 'p-anna', token: 'token-anna' },
        { role: 'SCRUM_MASTER', name: 'Anna' },
      );
      sessionStorage.clear();

      expect(tokens.identity('K7P2QX9M')).toEqual({ participantId: 'p-anna', token: 'token-anna' });
      expect(JSON.parse(sessionStorage.getItem('planningpoker.session.K7P2QX9M') ?? '')).toEqual({
        participantId: 'p-anna',
        token: 'token-anna',
      });
    });

    it('removes the identity from both stores', () => {
      tokens.store(
        'K7P2QX9M',
        { participantId: 'p-anna', token: 'token-anna' },
        { role: 'DEVELOPER', name: 'Anna' },
      );

      tokens.remove('K7P2QX9M');

      expect(tokens.identity('K7P2QX9M')).toBeNull();
      expect(recent.list()).toEqual([]);
    });
  });

  describe.each([
    ['switched off', false],
    ['not yet known', null],
  ])('with the recent sessions %s', (_, enabled) => {
    beforeEach(() => TestBed.inject(RecentSessions).enabled.set(enabled));

    it('writes no recent entry and has no fallback', () => {
      tokens.store(
        'K7P2QX9M',
        { participantId: 'p-anna', token: 'token-anna' },
        { role: 'SCRUM_MASTER', name: 'Anna' },
      );
      expect(localStorage.getItem(RECENT_SESSIONS_KEY)).toBeNull();

      localStorage.setItem(
        RECENT_SESSIONS_KEY,
        JSON.stringify([
          {
            sessionId: 'M3N4P5Q6',
            participantId: 'p-ben',
            token: 'token-ben',
            role: 'DEVELOPER',
            name: 'Ben',
            lastUsedAt: '2026-11-18T09:00:00.000Z',
          },
        ]),
      );
      expect(tokens.identity('M3N4P5Q6')).toBeNull();
    });
  });
});
