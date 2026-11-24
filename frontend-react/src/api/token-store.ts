import type { StorageAccess } from './preferences-store';
import type { ParticipantRole, RecentSessions } from './recent-sessions';

export interface SessionIdentity {
  participantId: string;
  token: string;
}

export interface ParticipantDetails {
  role: ParticipantRole;
  name: string;
}

export interface TokenStore {
  identity(sessionId: string): SessionIdentity | null;
  store(sessionId: string, identity: SessionIdentity, details?: ParticipantDetails): void;
  remove(sessionId: string): void;
}

const KEY_PREFIX = 'planningpoker.session.';

function isIdentity(value: unknown): value is SessionIdentity {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['participantId'] === 'string' &&
    typeof (value as Record<string, unknown>)['token'] === 'string'
  );
}

export function createTokenStore(
  storage: StorageAccess,
  recent: RecentSessions,
  now: () => number,
): TokenStore {
  const write = (sessionId: string, identity: SessionIdentity) =>
    storage().setItem(
      KEY_PREFIX + sessionId,
      JSON.stringify({ participantId: identity.participantId, token: identity.token }),
    );

  const storedIdentity = (sessionId: string): SessionIdentity | null => {
    const raw = storage().getItem(KEY_PREFIX + sessionId);
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isIdentity(parsed)
        ? { participantId: parsed.participantId, token: parsed.token }
        : null;
    } catch {
      return null;
    }
  };

  const recentIdentity = (sessionId: string): SessionIdentity | null => {
    if (recent.enabled() !== true) {
      return null;
    }
    const entry = recent.find(sessionId);
    if (entry === null) {
      return null;
    }
    const identity = { participantId: entry.participantId, token: entry.token };
    write(sessionId, identity);
    return identity;
  };

  return {
    identity: (sessionId) => storedIdentity(sessionId) ?? recentIdentity(sessionId),
    store(sessionId, identity, details) {
      write(sessionId, identity);
      if (recent.enabled() === true && details !== undefined) {
        recent.save({
          sessionId,
          participantId: identity.participantId,
          token: identity.token,
          role: details.role,
          name: details.name,
          lastUsedAt: new Date(now()).toISOString(),
        });
      }
    },
    remove(sessionId) {
      storage().removeItem(KEY_PREFIX + sessionId);
      recent.remove(sessionId);
    },
  };
}
