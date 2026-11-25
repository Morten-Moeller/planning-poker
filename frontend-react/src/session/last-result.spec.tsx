import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionView } from '../api/api';
import { discussionDeveloper, lobbyDeveloper, lobbyScrumMaster } from '../api/examples';
import { LastResult, lastConfirmed } from './last-result';
import {
  asViewer,
  confirmedEntry,
  receiveSnapshot,
  renderInSession,
  unconfirmedEntry,
  withHistory,
} from './testing/session-snapshots';

const confirmed = confirmedEntry();
const unconfirmed = unconfirmedEntry();

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

describe('lastConfirmed', () => {
  it.each<[string, SessionView | null, boolean]>([
    ['a developer in LOBBY after a confirmation', withHistory(lobbyDeveloper, confirmed), true],
    [
      'a viewer in LOBBY after a confirmation',
      withHistory(asViewer(lobbyDeveloper), confirmed),
      true,
    ],
    [
      'a developer in LOBBY when the newest entry has no final card',
      withHistory(lobbyDeveloper, unconfirmed, confirmed),
      false,
    ],
    ['a developer in LOBBY without history', withHistory(lobbyDeveloper), false],
    ['a developer after the next release', withHistory(discussionDeveloper, confirmed), false],
    ['the scrum master in LOBBY', withHistory(lobbyScrumMaster, confirmed), false],
    ['no session', null, false],
  ])('returns an entry for %s: %s', (_, snapshot, shown) => {
    expect(lastConfirmed(snapshot) !== null).toBe(shown);
  });
});

describe('LastResult', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows final card, issue, round, cards and the saved note after the confirmation', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, confirmed));

    const result = screen.getByTestId('last-result');
    expect(result.querySelector('h2')?.textContent).toBe('Zuletzt geschätzt');
    expect(result.textContent).toContain('Endwert');
    expect(text('last-result-final-card')).toBe('5');
    expect(text('last-result-issue')).toBe('#42 Login page');
    expect(text('last-result-round')).toBe('Runde 2');
    expect(text('last-result-cards')).toBe('5 · 8');
    const saved = screen.getByTestId('last-result-saved');
    expect(saved.textContent).toBe('Als Kommentar in GitLab gespeichert');
    expect(saved.previousElementSibling?.textContent).toBe('✓ ');
    expect(saved.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides the separators between the cards from screen readers', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, confirmed));

    const separators = [
      ...screen.getByTestId('last-result-cards').querySelectorAll('[aria-hidden="true"]'),
    ];
    expect(separators.map((separator) => separator.textContent)).toEqual([' · ']);
  });

  it('gives the cards ? and coffee an image role with their name', async () => {
    const entry = confirmedEntry({
      finalCard: 'COFFEE',
      votes: [
        { participantId: 'id-ben', name: 'Ben', card: '?' },
        { participantId: 'id-cem', name: 'Cem', card: 'COFFEE' },
        { participantId: 'id-dana', name: 'Dana', card: '13' },
      ],
    });

    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, entry));

    const final = screen.getByTestId('last-result-final-card');
    expect(final.getAttribute('role')).toBe('img');
    expect(final.getAttribute('aria-label')).toBe('Kaffeepause');
    expect(final.textContent).toBe('☕');
    const cards = within(screen.getByTestId('last-result-cards'));
    expect(cards.getByRole('img', { name: 'Unklar' }).textContent).toBe('?');
    expect(cards.getByRole('img', { name: 'Kaffeepause' }).textContent).toBe('☕');
    expect(cards.getAllByRole('img')).toHaveLength(2);
    expect(text('last-result-cards')).toBe('? · ☕ · 13');
  });

  it('gives a number card no image role', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, confirmed));

    const final = screen.getByTestId('last-result-final-card');
    expect(final.hasAttribute('role')).toBe(false);
    expect(final.hasAttribute('aria-label')).toBe(false);
  });

  it('links the issue in GitLab in a new tab when the project is known', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, confirmed));

    const link = screen.getByTestId('last-result-open');
    expect(link.getAttribute('href')).toBe('https://gitlab.com/webshop/frontend/-/issues/42');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(text('last-result-open')).toBe('In GitLab öffnen ↗');
    const symbol = link.querySelector('.app-symbol');
    expect(symbol?.textContent).toBe('↗');
    expect(symbol?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no link when the project is unknown', async () => {
    await renderInSession(
      <LastResult />,
      withHistory({ ...lobbyDeveloper, project: null }, confirmed),
    );

    expect(screen.getByTestId('last-result')).toBeTruthy();
    expect(screen.queryByTestId('last-result-open')).toBeNull();
  });

  it('shows the result to a viewer', async () => {
    await renderInSession(<LastResult />, withHistory(asViewer(lobbyDeveloper), confirmed));

    expect(text('last-result-final-card')).toBe('5');
  });

  it('shows nothing when the newest entry is not confirmed', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyDeveloper, unconfirmed, confirmed));

    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  it('disappears with the next release', async () => {
    const test = await renderInSession(<LastResult />, withHistory(lobbyDeveloper, confirmed));
    expect(screen.queryByTestId('last-result')).not.toBeNull();

    receiveSnapshot(test, withHistory(discussionDeveloper, confirmed));

    expect(screen.queryByTestId('last-result')).toBeNull();
  });

  it('is never shown to the scrum master', async () => {
    await renderInSession(<LastResult />, withHistory(lobbyScrumMaster, confirmed));

    expect(screen.queryByTestId('last-result')).toBeNull();
  });
});
