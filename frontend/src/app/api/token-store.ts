import { Injectable, inject } from '@angular/core';
import { ParticipantRole, RecentSessions } from './recent-sessions';

export interface SessionIdentity {
  participantId: string;
  token: string;
}

export interface ParticipantDetails {
  role: ParticipantRole;
  name: string;
}

const KEY_PREFIX = 'planningpoker.session.';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly recent = inject(RecentSessions);

  identity(sessionId: string): SessionIdentity | null {
    return this.storedIdentity(sessionId) ?? this.recentIdentity(sessionId);
  }

  store(sessionId: string, identity: SessionIdentity, details?: ParticipantDetails): void {
    sessionStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(identity));
    if (this.recent.enabled() === true && details !== undefined) {
      this.recent.save({
        sessionId,
        participantId: identity.participantId,
        token: identity.token,
        role: details.role,
        name: details.name,
        lastUsedAt: new Date().toISOString(),
      });
    }
  }

  remove(sessionId: string): void {
    sessionStorage.removeItem(KEY_PREFIX + sessionId);
    this.recent.remove(sessionId);
  }

  private storedIdentity(sessionId: string): SessionIdentity | null {
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

  private recentIdentity(sessionId: string): SessionIdentity | null {
    if (this.recent.enabled() !== true) {
      return null;
    }
    const entry = this.recent.find(sessionId);
    if (entry === null) {
      return null;
    }
    const identity = { participantId: entry.participantId, token: entry.token };
    sessionStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(identity));
    return identity;
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
