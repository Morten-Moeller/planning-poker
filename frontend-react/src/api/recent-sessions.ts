import type { StorageAccess } from './preferences-store';
import type { components } from './schema';

export type ParticipantRole = components['schemas']['Role'];
export type ConfigResponse = components['schemas']['ConfigResponse'];

export interface RecentSession {
  sessionId: string;
  participantId: string;
  token: string;
  role: ParticipantRole;
  name: string;
  lastUsedAt: string;
}

export interface RecentSessions {
  enabled(): boolean | null;
  list(): RecentSession[];
  find(sessionId: string): RecentSession | null;
  save(entry: RecentSession): void;
  remove(sessionId: string): void;
  clear(): void;
  loadSetting(loadConfig: (signal: AbortSignal) => Promise<ConfigResponse>): Promise<void>;
}

export type StartTimeout = (handler: () => void, delayMs: number) => unknown;

export const RECENT_SESSIONS_KEY = 'planningpoker.recent-sessions';
export const RECENT_SESSIONS_MAX = 5;
export const CONFIG_TIMEOUT_MS = 3000;
const ROLES: readonly ParticipantRole[] = ['SCRUM_MASTER', 'DEVELOPER', 'VIEWER'];
const TEXT_FIELDS = ['sessionId', 'participantId', 'token', 'name', 'lastUsedAt'] as const;

function isRecentSession(value: unknown): value is RecentSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    TEXT_FIELDS.every((key) => typeof entry[key] === 'string') &&
    ROLES.includes(entry['role'] as ParticipantRole) &&
    !Number.isNaN(Date.parse(entry['lastUsedAt'] as string))
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

export function createRecentSessions(
  storage: StorageAccess,
  startTimeout: StartTimeout,
): RecentSessions {
  let enabled: boolean | null = null;

  const list = (): RecentSession[] => {
    try {
      const parsed: unknown = JSON.parse(storage().getItem(RECENT_SESSIONS_KEY) ?? '[]');
      return Array.isArray(parsed) && parsed.every(isRecentSession)
        ? parsed.slice(0, RECENT_SESSIONS_MAX).map(copy)
        : [];
    } catch {
      return [];
    }
  };

  const write = (entries: RecentSession[]) => {
    try {
      storage().setItem(RECENT_SESSIONS_KEY, JSON.stringify(entries));
    } catch {
      return;
    }
  };

  return {
    enabled: () => enabled,
    list,
    find: (sessionId) => list().find((entry) => entry.sessionId === sessionId) ?? null,
    save(entry) {
      const others = list().filter((existing) => existing.sessionId !== entry.sessionId);
      write([copy(entry), ...others].slice(0, RECENT_SESSIONS_MAX));
    },
    remove(sessionId) {
      const entries = list();
      const remaining = entries.filter((entry) => entry.sessionId !== sessionId);
      if (remaining.length !== entries.length) {
        write(remaining);
      }
    },
    clear() {
      try {
        storage().removeItem(RECENT_SESSIONS_KEY);
      } catch {
        return;
      }
    },
    loadSetting(loadConfig) {
      const controller = new AbortController();
      return new Promise<void>((resolve) => {
        startTimeout(() => {
          controller.abort();
          resolve();
        }, CONFIG_TIMEOUT_MS);
        loadConfig(controller.signal).then(
          (config) => {
            if (!controller.signal.aborted && typeof config.rememberSessions === 'boolean') {
              enabled = config.rememberSessions;
            }
            resolve();
          },
          () => resolve(),
        );
      });
    },
  };
}
