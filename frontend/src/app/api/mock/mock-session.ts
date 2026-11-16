import type { components } from '../schema';
import { lobbyDeveloper, lobbyScrumMaster, SessionView } from '../examples';

export type Role = components['schemas']['Role'];

export const MOCK_SESSION_ID = lobbyScrumMaster.sessionId;

const TOKEN_PREFIX: Record<Role, string> = {
  SCRUM_MASTER: 'mock-scrum-master-',
  DEVELOPER: 'mock-developer-',
};

export function issueToken(role: Role): string {
  return TOKEN_PREFIX[role] + crypto.randomUUID();
}

export function roleOfToken(token: string | null): Role | null {
  if (token === null) {
    return null;
  }
  if (token.startsWith(TOKEN_PREFIX.SCRUM_MASTER)) {
    return 'SCRUM_MASTER';
  }
  if (token.startsWith(TOKEN_PREFIX.DEVELOPER)) {
    return 'DEVELOPER';
  }
  return null;
}

export function snapshotFor(role: Role): SessionView {
  const example = role === 'SCRUM_MASTER' ? lobbyScrumMaster : lobbyDeveloper;
  return { ...example, serverTime: new Date().toISOString() };
}
