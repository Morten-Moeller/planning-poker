import { TestBed } from '@angular/core/testing';
import { TokenStore } from './token-store';

describe('TokenStore', () => {
  let tokens: TokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    tokens = TestBed.inject(TokenStore);
  });

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
});
