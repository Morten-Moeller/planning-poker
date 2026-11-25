import { describe, expect, it } from 'vitest';
import { lobbyDeveloper, votingDeveloper } from '../api/examples';
import { asViewer, withDeveloper, withParticipant } from './testing/session-snapshots';
import { voteProgress } from './vote-progress';

describe('voteProgress', () => {
  it('counts the connected developers and their votes', () => {
    expect(voteProgress(votingDeveloper.participants)).toEqual({ total: 2, voted: 1 });
  });

  it('counts neither the scrum master nor a viewer', () => {
    const snapshot = withParticipant(asViewer(votingDeveloper), 'Anna', { hasVoted: true });

    expect(voteProgress(snapshot.participants)).toEqual({ total: 2, voted: 1 });
  });

  it('leaves out a disconnected developer, also with a vote', () => {
    const waiting = withDeveloper(votingDeveloper, 'Dana', false);
    const voted = withParticipant(votingDeveloper, 'Ben', { connected: false });

    expect(voteProgress(waiting.participants)).toEqual({ total: 2, voted: 1 });
    expect(voteProgress(voted.participants)).toEqual({ total: 1, voted: 0 });
  });

  it('gives zero without developers', () => {
    const none = lobbyDeveloper.participants.filter(
      (participant) => participant.role !== 'DEVELOPER',
    );

    expect(voteProgress(none)).toEqual({ total: 0, voted: 0 });
  });
});
