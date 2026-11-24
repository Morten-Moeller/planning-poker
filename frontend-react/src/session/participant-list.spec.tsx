import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionView } from '../api/api';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { ParticipantList } from './participant-list';
import {
  asViewer,
  receiveSnapshot,
  renderInSession,
  withViewers,
} from './testing/session-snapshots';

type Phase = SessionView['phase'];

const SNAPSHOT: Record<Phase, SessionView> = {
  LOBBY: lobbyDeveloper,
  DISCUSSION: discussionDeveloper,
  VOTING: votingDeveloper,
  REVEALED: revealedDeveloper,
};

function withVote(snapshot: SessionView, name: string, hasVoted: boolean): SessionView {
  return {
    ...snapshot,
    participants: snapshot.participants.map((participant) =>
      participant.name === name ? { ...participant, hasVoted } : participant,
    ),
  };
}

function row(name: string): HTMLElement {
  const found = screen
    .getAllByTestId('participant')
    .find((entry) => within(entry).getByTestId('participant-name').textContent === name);
  if (found === undefined) {
    throw new Error(`no participant row with the name ${name}`);
  }
  return found;
}

function textOf(entry: HTMLElement, testId: string): string | null {
  return within(entry).queryByTestId(testId)?.textContent ?? null;
}

function hiddenSymbolBefore(element: HTMLElement): string | null {
  const symbol = element.previousElementSibling;
  return symbol?.getAttribute('aria-hidden') === 'true' ? symbol.textContent : null;
}

describe('ParticipantList', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows the count in the title', async () => {
    await renderInSession(<ParticipantList />, withViewers(lobbyScrumMaster, 'Paula'));

    expect(screen.getByTestId('participant-title').textContent).toBe('Teilnehmer · 4');
  });

  it('lists scrum master and developers first and viewers after them', async () => {
    const snapshot: SessionView = {
      ...lobbyScrumMaster,
      participants: [
        { id: 'id-paula', name: 'Paula', role: 'VIEWER', connected: true, hasVoted: false },
        ...lobbyScrumMaster.participants,
        { id: 'id-quinn', name: 'Quinn', role: 'VIEWER', connected: true, hasVoted: false },
      ],
    };

    await renderInSession(<ParticipantList />, snapshot);

    const list = screen.getByTestId('participant-list');
    expect(
      within(list)
        .getAllByTestId('participant-name')
        .map((name) => name.textContent),
    ).toEqual(['Anna', 'Ben', 'Cem', 'Paula', 'Quinn']);
  });

  it('marks only the own row with (du) and highlights it', async () => {
    await renderInSession(<ParticipantList />, lobbyDeveloper);

    expect(textOf(row('Ben'), 'participant-me')).toBe('(du)');
    expect(row('Ben').getAttribute('data-me')).toBe('true');
    expect(textOf(row('Anna'), 'participant-me')).toBeNull();
    expect(row('Anna').hasAttribute('data-me')).toBe(false);
    expect(screen.getAllByTestId('participant-me')).toHaveLength(1);
  });

  it('labels the scrum master and a viewer with a symbol outside the label', async () => {
    await renderInSession(<ParticipantList />, withViewers(lobbyDeveloper, 'Paula'));

    const scrumMaster = within(row('Anna')).getByTestId('participant-role');
    const viewer = within(row('Paula')).getByTestId('participant-role');
    expect(scrumMaster.textContent).toBe('Scrum Master');
    expect(hiddenSymbolBefore(scrumMaster)).toBe('★ ');
    expect(viewer.textContent).toBe('Zuschauer');
    expect(hiddenSymbolBefore(viewer)).toBe('👁 ');
    expect(textOf(row('Ben'), 'participant-role')).toBeNull();
  });

  it('shows the connection as text with a symbol outside the text', async () => {
    await renderInSession(<ParticipantList />, lobbyDeveloper);

    const connected = within(row('Ben')).getByTestId('participant-status');
    const disconnected = within(row('Cem')).getByTestId('participant-status');
    expect(connected.textContent).toBe('verbunden');
    expect(hiddenSymbolBefore(connected)).toBe('● ');
    expect(disconnected.textContent).toBe('getrennt');
    expect(hiddenSymbolBefore(disconnected)).toBe('○ ');
  });

  it.each([
    { phase: 'LOBBY', voted: false, filled: 'false' },
    { phase: 'DISCUSSION', voted: false, filled: 'false' },
    { phase: 'DISCUSSION', voted: true, filled: 'false' },
    { phase: 'VOTING', voted: false, filled: 'false' },
    { phase: 'VOTING', voted: true, filled: 'true' },
    { phase: 'REVEALED', voted: false, filled: 'false' },
    { phase: 'REVEALED', voted: true, filled: 'true' },
  ] as const)(
    'shows the chip of a developer in $phase with hasVoted $voted as filled $filled',
    async ({ phase, voted, filled }) => {
      await renderInSession(<ParticipantList />, withVote(SNAPSHOT[phase], 'Cem', voted));

      const chip = within(row('Cem')).getByTestId('participant-chip');
      expect(chip.getAttribute('data-filled')).toBe(filled);
      expect(chip.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it.each(['LOBBY', 'DISCUSSION', 'VOTING', 'REVEALED'] as const)(
    'shows no chip for the scrum master and a viewer in %s',
    async (phase) => {
      await renderInSession(<ParticipantList />, withViewers(SNAPSHOT[phase], 'Paula'));

      expect(within(row('Anna')).queryByTestId('participant-chip')).toBeNull();
      expect(within(row('Paula')).queryByTestId('participant-chip')).toBeNull();
      expect(
        row('Anna').firstElementChild?.querySelector('[data-testid="participant-name"]'),
      ).not.toBeNull();
    },
  );

  it.each([
    {
      role: 'scrum master',
      name: 'Anna',
      phase: 'LOBBY',
      activity: 'Moderiert, schätzt nicht mit',
      vote: null,
      symbol: null,
    },
    {
      role: 'scrum master',
      name: 'Anna',
      phase: 'DISCUSSION',
      activity: 'Moderiert, schätzt nicht mit',
      vote: null,
      symbol: null,
    },
    {
      role: 'scrum master',
      name: 'Anna',
      phase: 'VOTING',
      activity: 'Moderiert, schätzt nicht mit',
      vote: null,
      symbol: null,
    },
    {
      role: 'scrum master',
      name: 'Anna',
      phase: 'REVEALED',
      activity: 'Moderiert, schätzt nicht mit',
      vote: null,
      symbol: null,
    },
    { role: 'viewer', name: 'Paula', phase: 'LOBBY', activity: null, vote: null, symbol: null },
    {
      role: 'viewer',
      name: 'Paula',
      phase: 'DISCUSSION',
      activity: null,
      vote: null,
      symbol: null,
    },
    { role: 'viewer', name: 'Paula', phase: 'VOTING', activity: null, vote: null, symbol: null },
    { role: 'viewer', name: 'Paula', phase: 'REVEALED', activity: null, vote: null, symbol: null },
    {
      role: 'developer',
      name: 'Cem',
      phase: 'LOBBY',
      activity: 'Bereit',
      vote: null,
      symbol: null,
    },
    {
      role: 'developer',
      name: 'Cem',
      phase: 'DISCUSSION',
      activity: 'Diskutiert',
      vote: null,
      symbol: null,
    },
    {
      role: 'developer with a vote',
      name: 'Ben',
      phase: 'VOTING',
      activity: null,
      vote: 'Hat geschätzt',
      symbol: '✓ ',
    },
    {
      role: 'developer without a vote',
      name: 'Cem',
      phase: 'VOTING',
      activity: null,
      vote: 'Ausstehend',
      symbol: '○ ',
    },
    {
      role: 'developer with a vote',
      name: 'Ben',
      phase: 'REVEALED',
      activity: null,
      vote: 'Hat geschätzt',
      symbol: '✓ ',
    },
    {
      role: 'developer without a vote',
      name: 'Cem',
      phase: 'REVEALED',
      activity: null,
      vote: 'Nicht geschätzt',
      symbol: null,
    },
  ] as const)(
    'shows the state of a $role in $phase',
    async ({ name, phase, activity, vote, symbol }) => {
      const snapshot = withViewers(
        withVote(withVote(SNAPSHOT[phase], 'Ben', true), 'Cem', false),
        'Paula',
      );

      await renderInSession(<ParticipantList />, snapshot);

      expect(textOf(row(name), 'participant-activity')).toBe(activity);
      expect(textOf(row(name), 'participant-vote-status')).toBe(vote);
      const status = within(row(name)).queryByTestId('participant-vote-status');
      expect(status === null ? null : hiddenSymbolBefore(status)).toBe(symbol);
    },
  );

  it.each([
    { name: 'the scrum master', snapshot: votingScrumMaster },
    { name: 'the scrum master in the discussion', snapshot: discussionScrumMaster },
    { name: 'a viewer', snapshot: asViewer(votingDeveloper) },
  ])('shows the same list to $name', async ({ snapshot }) => {
    await renderInSession(<ParticipantList />, snapshot);

    expect(textOf(row('Anna'), 'participant-activity')).toBe('Moderiert, schätzt nicht mit');
    expect(textOf(row('Ben'), 'participant-name')).toBe('Ben');
  });

  it('follows the next snapshot', async () => {
    const test = await renderInSession(<ParticipantList />, votingDeveloper);
    expect(textOf(row('Cem'), 'participant-vote-status')).toBe('Ausstehend');

    receiveSnapshot(test, withVote(votingDeveloper, 'Cem', true));

    expect(textOf(row('Cem'), 'participant-vote-status')).toBe('Hat geschätzt');
    expect(within(row('Cem')).getByTestId('participant-chip').getAttribute('data-filled')).toBe(
      'true',
    );
  });
});
