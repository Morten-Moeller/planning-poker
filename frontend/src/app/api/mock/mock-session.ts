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
  VIEWER: 'mock-viewer-',
};

export const MOCK_INVITES = lobbyScrumMaster.invites!;

const MOCK_VIEWER: SessionView['participants'][number] = {
  id: '01973f5e-2a4f-7a1b-8c2d-3e4f5a6b7c8d',
  name: 'Paula',
  role: 'VIEWER',
  connected: true,
  hasVoted: false,
};

const EXAMPLES: Record<Phase, Record<Exclude<Role, 'VIEWER'>, SessionView>> = {
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
  const roles = Object.keys(TOKEN_PREFIX) as Role[];
  return roles.find((role) => token.startsWith(TOKEN_PREFIX[role])) ?? null;
}

export function roleOfInvite(invite: string | undefined): Role | null {
  if (invite === MOCK_INVITES.developer) {
    return 'DEVELOPER';
  }
  return invite === MOCK_INVITES.viewer ? 'VIEWER' : null;
}

export function snapshotFor(role: Role): SessionView {
  const example = role === 'VIEWER' ? viewerSnapshot() : EXAMPLES[mockPhase][role];
  return {
    ...example,
    project: MOCK_PROJECT,
    writeWeight: MOCK_WRITE_WEIGHT,
    serverTime: new Date().toISOString(),
  };
}

function viewerSnapshot(): SessionView {
  const example = EXAMPLES[mockPhase].DEVELOPER;
  return {
    ...example,
    me: { participantId: MOCK_VIEWER.id, role: 'VIEWER' },
    participants: [...example.participants, MOCK_VIEWER],
    round: example.round === null ? null : { ...example.round, myVote: null },
  };
}
