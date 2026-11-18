import type { SessionView } from '../api/api.service';

type Participant = SessionView['participants'][number];

export interface VoteProgress {
  total: number;
  voted: number;
}

export function voteProgress(participants: readonly Participant[]): VoteProgress {
  const connected = participants.filter(
    (participant) => participant.role === 'DEVELOPER' && participant.connected,
  );
  return {
    total: connected.length,
    voted: connected.filter((participant) => participant.hasVoted).length,
  };
}
