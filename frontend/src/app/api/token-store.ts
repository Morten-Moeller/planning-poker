import { Injectable } from '@angular/core';

export interface SessionIdentity {
  participantId: string;
  token: string;
}

const KEY_PREFIX = 'planningpoker.session.';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  identity(sessionId: string): SessionIdentity | null {
    const raw = sessionStorage.getItem(KEY_PREFIX + sessionId);
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
  }

  store(sessionId: string, identity: SessionIdentity): void {
    sessionStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(identity));
  }

  remove(sessionId: string): void {
    sessionStorage.removeItem(KEY_PREFIX + sessionId);
  }
}

function isIdentity(value: unknown): value is SessionIdentity {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['participantId'] === 'string' &&
    typeof (value as Record<string, unknown>)['token'] === 'string'
  );
}
