import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ApiService } from './api.service';
import type { components } from './schema';

export type ParticipantRole = components['schemas']['Role'];

export interface RecentSession {
  sessionId: string;
  participantId: string;
  token: string;
  role: ParticipantRole;
  name: string;
  lastUsedAt: string;
}

export const RECENT_SESSIONS_KEY = 'planningpoker.recent-sessions';
export const RECENT_SESSIONS_MAX = 5;
const ROLES: readonly ParticipantRole[] = ['SCRUM_MASTER', 'DEVELOPER'];

@Injectable({ providedIn: 'root' })
export class RecentSessions {
  readonly enabled = signal<boolean | null>(null);

  list(): RecentSession[] {
    try {
      const raw = localStorage.getItem(RECENT_SESSIONS_KEY);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      return Array.isArray(parsed) && parsed.every(isRecentSession)
        ? parsed.slice(0, RECENT_SESSIONS_MAX).map(copy)
        : [];
    } catch {
      return [];
    }
  }

  find(sessionId: string): RecentSession | null {
    return this.list().find((entry) => entry.sessionId === sessionId) ?? null;
  }

  save(entry: RecentSession): void {
    const others = this.list().filter((existing) => existing.sessionId !== entry.sessionId);
    this.write([entry, ...others].slice(0, RECENT_SESSIONS_MAX));
  }

  remove(sessionId: string): void {
    const entries = this.list();
    const remaining = entries.filter((entry) => entry.sessionId !== sessionId);
    if (remaining.length !== entries.length) {
      this.write(remaining);
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(RECENT_SESSIONS_KEY);
    } catch {
      return;
    }
  }

  private write(entries: RecentSession[]): void {
    try {
      localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(entries));
    } catch {
      return;
    }
  }
}

const CONFIG_TIMEOUT_MS = 3000;

export function loadRecentSessionsSetting(): Promise<void> {
  const recent = inject(RecentSessions);
  return firstValueFrom(inject(ApiService).config().pipe(timeout(CONFIG_TIMEOUT_MS))).then(
    (config) => recent.enabled.set(config.rememberSessions),
    () => undefined,
  );
}

function copy(entry: RecentSession): RecentSession {
  return {
    sessionId: entry.sessionId,
    participantId: entry.participantId,
    token: entry.token,
    role: entry.role,
    name: entry.name,
    lastUsedAt: entry.lastUsedAt,
  };
}

function isRecentSession(value: unknown): value is RecentSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    ['sessionId', 'participantId', 'token', 'name', 'lastUsedAt'].every(
      (key) => typeof entry[key] === 'string',
    ) &&
    ROLES.includes(entry['role'] as ParticipantRole) &&
    !Number.isNaN(Date.parse(entry['lastUsedAt'] as string))
  );
}
