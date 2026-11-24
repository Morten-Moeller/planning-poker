import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  discussionDeveloper,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  votingDeveloper,
} from '../api/examples';
import { createTestBackend, renderWithBackend } from '../api/testing/test-backend';
import { SessionFacts } from './session-facts';
import {
  asViewer,
  receiveSnapshot,
  renderInSession,
  withViewers,
} from './testing/session-snapshots';

function text(testId: string): string {
  return screen.getByTestId(testId).textContent;
}

describe('SessionFacts', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows nothing without a snapshot', () => {
    renderWithBackend(<SessionFacts />, createTestBackend().backend);

    expect(screen.queryByTestId('session-facts')).toBeNull();
  });

  it('shows the title and the four labels in their order', async () => {
    await renderInSession(<SessionFacts />, lobbyScrumMaster);

    const facts = screen.getByTestId('session-facts');
    expect(facts.querySelector('h2')?.textContent).toBe('Fakten');
    expect([...facts.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
      'Session-ID',
      'Phase',
      'Deine Rolle',
      'Teilnehmer',
    ]);
  });

  it('shows the session id', async () => {
    await renderInSession(<SessionFacts />, lobbyScrumMaster);

    expect(text('session-id')).toBe('K7P2QX9M');
  });

  it.each([
    { name: 'LOBBY', snapshot: lobbyDeveloper, phase: 'Wartet auf ein Issue' },
    { name: 'DISCUSSION', snapshot: discussionDeveloper, phase: 'Diskussion' },
    { name: 'VOTING', snapshot: votingDeveloper, phase: 'Runde läuft' },
    { name: 'REVEALED', snapshot: revealedDeveloper, phase: 'Runde aufgelöst' },
  ])('names the phase $name', async ({ snapshot, phase }) => {
    await renderInSession(<SessionFacts />, snapshot);

    expect(text('session-phase')).toBe(phase);
  });

  it.each([
    { snapshot: lobbyScrumMaster, role: 'Scrum Master' },
    { snapshot: lobbyDeveloper, role: 'Entwickler' },
    { snapshot: asViewer(lobbyDeveloper), role: 'Zuschauer' },
  ])('names the own role $role', async ({ snapshot, role }) => {
    await renderInSession(<SessionFacts />, snapshot);

    expect(text('session-role')).toBe(role);
  });

  it('counts the participants and the developers', async () => {
    await renderInSession(<SessionFacts />, lobbyScrumMaster);

    expect(text('session-participant-count')).toBe('3');
    expect(text('session-developer-count')).toBe('(2 Entwickler)');
    expect(text('session-participants')).toBe('3 (2 Entwickler)');
  });

  it('counts the viewers when the session has one', async () => {
    await renderInSession(<SessionFacts />, withViewers(lobbyScrumMaster, 'Paula', 'Quinn'));

    expect(text('session-participant-count')).toBe('5');
    expect(text('session-developer-count')).toBe('(2 Entwickler, 2 Zuschauer)');
  });

  it('follows the next snapshot', async () => {
    const test = await renderInSession(<SessionFacts />, lobbyDeveloper);

    receiveSnapshot(test, withViewers(votingDeveloper, 'Paula'));

    expect(text('session-phase')).toBe('Runde läuft');
    expect(text('session-developer-count')).toBe('(2 Entwickler, 1 Zuschauer)');
  });
});
