import { Subject } from 'rxjs';
import type { components } from '../schema';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  SessionView,
  votingDeveloper,
  votingScrumMaster,
} from '../examples';

export type Role = components['schemas']['Role'];
export type Phase = components['schemas']['Phase'];

export const MOCK_SESSION_ID = lobbyScrumMaster.sessionId;

export const MOCK_PROJECT: components['schemas']['ProjectSummary'] = {
  id: 1234,
  name: 'Planning Poker',
  pathWithNamespace: 'group/planning-poker',
  webUrl: 'https://gitlab.com/group/planning-poker',
};

export const MOCK_WRITE_WEIGHT = false;

const TOKEN_PREFIX: Record<Role, string> = {
  SCRUM_MASTER: 'mock-scrum-master-',
  DEVELOPER: 'mock-developer-',
};

const EXAMPLES: Record<Phase, Record<Role, SessionView>> = {
  LOBBY: { SCRUM_MASTER: lobbyScrumMaster, DEVELOPER: lobbyDeveloper },
  DISCUSSION: { SCRUM_MASTER: discussionScrumMaster, DEVELOPER: discussionDeveloper },
  VOTING: { SCRUM_MASTER: votingScrumMaster, DEVELOPER: votingDeveloper },
  REVEALED: { SCRUM_MASTER: revealedScrumMaster, DEVELOPER: revealedDeveloper },
};

let mockPhase: Phase = 'LOBBY';

export const mockPhaseChanges = new Subject<Phase>();

export function currentMockPhase(): Phase {
  return mockPhase;
}

export function changeMockPhase(phase: Phase): void {
  mockPhase = phase;
  mockPhaseChanges.next(phase);
}

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
  const example = EXAMPLES[mockPhase][role];
  return {
    ...example,
    project: MOCK_PROJECT,
    writeWeight: MOCK_WRITE_WEIGHT,
    serverTime: new Date().toISOString(),
  };
}
