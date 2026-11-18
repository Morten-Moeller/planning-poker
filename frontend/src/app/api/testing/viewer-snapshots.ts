import type { SessionView } from '../examples';

type Participant = SessionView['participants'][number];

export const VIEWER_ID = '01973f5e-2a4f-7a1b-8c2d-3e4f5a6b7c8d';

export function viewer(name: string, id = `id-${name.toLowerCase()}`): Participant {
  return { id, name, role: 'VIEWER', connected: true, hasVoted: false };
}

export function withViewers(snapshot: SessionView, ...names: string[]): SessionView {
  return {
    ...snapshot,
    participants: [...snapshot.participants, ...names.map((name) => viewer(name))],
  };
}

export function asViewer(snapshot: SessionView, name = 'Paula'): SessionView {
  return {
    ...snapshot,
    me: { participantId: VIEWER_ID, role: 'VIEWER' },
    participants: [...snapshot.participants, viewer(name, VIEWER_ID)],
    round: snapshot.round === null ? null : { ...snapshot.round, myVote: null },
    invites: null,
  };
}
