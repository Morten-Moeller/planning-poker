import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { discussionDeveloper, lobbyScrumMaster, votingDeveloper } from '../api/examples';
import { problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { CardDeck } from './card-deck';
import {
  SessionPart,
  receiveSnapshot,
  renderInSession,
  withRound,
} from './testing/session-snapshots';

const ID = lobbyScrumMaster.sessionId;
const ORDER = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', 'COFFEE'];

function Deck() {
  return (
    <SessionPart
      render={(session) => <CardDeck session={session} locked={session.phase === 'DISCUSSION'} />}
    />
  );
}

function show(snapshot: SessionView, command?: Answer) {
  return renderInSession(<Deck />, snapshot, command);
}

function noVote(snapshot: SessionView = votingDeveloper): SessionView {
  return withRound(snapshot, { myVote: null });
}

function cards(): HTMLButtonElement[] {
  return within(screen.getByRole('group')).getAllByRole<HTMLButtonElement>('button');
}

function card(value: string): HTMLButtonElement {
  return screen.getByTestId<HTMLButtonElement>(`card-${value}`);
}

function votes(calls: readonly FetchCall[]): unknown[] {
  return calls.filter((call) => call.method !== 'GET').map((call) => call.body);
}

function held(): { answer: Answer; release: (response: Response) => void } {
  let release: (response: Response) => void = () => undefined;
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { answer: () => response, release: (value) => release(value) };
}

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function unlockIndexes(): (string | null)[] {
  return cards().map((button) =>
    button.hasAttribute('data-unlock') ? button.style.getPropertyValue('--unlock-index') : null,
  );
}

describe('CardDeck', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    reducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('open', () => {
    it('shows the heading, the hint and the group Deine Karte', async () => {
      await show(votingDeveloper);

      const deck = screen.getByTestId('card-deck');
      expect(deck.tagName).toBe('SECTION');
      expect(within(deck).getByRole('heading', { level: 2 }).textContent).toBe('Deine Karte');
      expect(screen.getByTestId('card-deck-hint').textContent).toBe(
        'Du kannst sie ändern, bis aufgelöst wird.',
      );
      expect(screen.getByRole('group', { name: 'Deine Karte' })).toBeTruthy();
      expect(screen.queryByTestId('discussion-hint')).toBeNull();
      expect(screen.queryByTestId('card-deck-locked')).toBeNull();
    });

    it('shows the eleven cards as buttons in the order of the deck', async () => {
      await show(votingDeveloper);

      expect(cards().map((button) => button.getAttribute('data-testid'))).toEqual(
        ORDER.map((value) => `card-${value}`),
      );
      expect(cards().every((button) => button.tabIndex === 0)).toBe(true);
    });

    it('names every card with Karte and its value', async () => {
      await show(votingDeveloper);

      expect(cards().map((button) => button.getAttribute('aria-label'))).toEqual([
        'Karte 0',
        'Karte 1',
        'Karte 2',
        'Karte 3',
        'Karte 5',
        'Karte 8',
        'Karte 13',
        'Karte 21',
        'Karte 34',
        'Karte Unklar',
        'Karte Kaffeepause',
      ]);
    });

    it('marks no card without an own vote', async () => {
      await show(noVote());

      expect(cards().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('marks only the card of the own vote from the snapshot', async () => {
      await show(votingDeveloper);

      expect(cards().filter((button) => button.getAttribute('aria-pressed') === 'true')).toEqual([
        card('5'),
      ]);
      expect(card('5').textContent).toBe('✓ GEWÄHLT5');
    });

    it('sends the chosen card and keeps the mark until the next snapshot', async () => {
      const user = userEvent.setup();
      const test = await show(votingDeveloper);

      await user.click(card('8'));

      expect(test.calls.filter((call) => call.method !== 'GET').map((call) => call.url)).toEqual([
        `/api/sessions/${ID}/vote`,
      ]);
      expect(test.calls.find((call) => call.method !== 'GET')?.method).toBe('PUT');
      expect(votes(test.calls)).toEqual([{ card: '8' }]);
      expect(card('5').getAttribute('aria-pressed')).toBe('true');
      expect(card('8').getAttribute('aria-pressed')).toBe('false');

      receiveSnapshot(test, withRound(votingDeveloper, { myVote: '8' }));

      expect(card('8').getAttribute('aria-pressed')).toBe('true');
      expect(card('5').getAttribute('aria-pressed')).toBe('false');
    });

    it('sends the cards without a number as their value of the contract', async () => {
      const user = userEvent.setup();
      const { calls } = await show(noVote());

      await user.click(card('?'));
      await waitFor(() => expect(card('?').hasAttribute('aria-disabled')).toBe(false));
      await user.click(card('COFFEE'));

      expect(votes(calls)).toEqual([{ card: '?' }, { card: 'COFFEE' }]);
    });

    it('takes no second click while the vote is being sent', async () => {
      const user = userEvent.setup();
      const command = held();
      const { calls } = await show(noVote(), command.answer);

      await user.click(card('3'));
      expect(cards().every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(true);
      await user.click(card('5'));

      expect(votes(calls)).toEqual([{ card: '3' }]);

      act(() => command.release(new Response(null, { status: 204 })));

      await waitFor(() =>
        expect(cards().some((button) => button.hasAttribute('aria-disabled'))).toBe(false),
      );
    });

    it('takes clicks again after a failed vote', async () => {
      const user = userEvent.setup();
      const { calls, backend } = await show(noVote(), () => problem(409, 'INVALID_STATE'));

      await user.click(card('3'));
      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));
      await waitFor(() => expect(card('3').hasAttribute('aria-disabled')).toBe(false));
      await user.click(card('5'));

      expect(votes(calls)).toEqual([{ card: '3' }, { card: '5' }]);
    });
  });

  describe('keyboard', () => {
    it.each([
      { key: '{ArrowRight}', from: '5', to: '8' },
      { key: '{ArrowDown}', from: '5', to: '8' },
      { key: '{ArrowLeft}', from: '5', to: '3' },
      { key: '{ArrowUp}', from: '5', to: '3' },
      { key: '{ArrowRight}', from: 'COFFEE', to: '0' },
      { key: '{ArrowLeft}', from: '0', to: 'COFFEE' },
      { key: '{Home}', from: '13', to: '0' },
      { key: '{End}', from: '13', to: 'COFFEE' },
    ])('moves the focus with $key from $from to $to', async ({ key, from, to }) => {
      const user = userEvent.setup();
      const { calls } = await show(noVote());
      act(() => card(from).focus());

      await user.keyboard(key);

      expect(document.activeElement).toBe(card(to));
      expect(votes(calls)).toHaveLength(0);
    });

    it.each([
      { name: 'Enter', key: '{Enter}' },
      { name: 'Space', key: ' ' },
    ])('chooses the card with the focus with $name, once', async ({ key }) => {
      const user = userEvent.setup();
      const { calls } = await show(noVote());
      act(() => card('13').focus());

      await user.keyboard(key);

      expect(votes(calls)).toEqual([{ card: '13' }]);
    });

    it('keeps the focus for another key', async () => {
      const user = userEvent.setup();
      const { calls } = await show(noVote());
      act(() => card('13').focus());

      await user.keyboard('a');

      expect(document.activeElement).toBe(card('13'));
      expect(votes(calls)).toHaveLength(0);
    });

    it('scrolls a card with the focus into the row', async () => {
      await show(noVote());
      const list = screen.getByRole('group');
      vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 80));
      vi.spyOn(card('COFFEE'), 'getBoundingClientRect').mockReturnValue(
        new DOMRect(520, 0, 48, 70),
      );
      vi.spyOn(card('0'), 'getBoundingClientRect').mockReturnValue(new DOMRect(-40, 0, 48, 70));

      fireEvent.focus(card('COFFEE'));
      expect(list.scrollLeft).toBe(268);

      fireEvent.focus(card('0'));
      expect(list.scrollLeft).toBe(228);
    });

    it('scrolls the card of the own vote into the row', async () => {
      const test = await show(noVote());
      const list = screen.getByRole('group');
      vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 80));
      vi.spyOn(card('34'), 'getBoundingClientRect').mockReturnValue(new DOMRect(400, 0, 48, 70));

      receiveSnapshot(test, withRound(votingDeveloper, { myVote: '34' }));

      expect(list.scrollLeft).toBe(148);
    });
  });

  describe('locked', () => {
    it('shows the locked heading and the hint of the discussion', async () => {
      await show(discussionDeveloper);

      const deck = screen.getByTestId('card-deck-locked');
      expect(within(deck).getByRole('heading', { level: 2 }).textContent).toBe(
        'Deine Karte · gesperrt',
      );
      const hint = screen.getByTestId('discussion-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe(
        'Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.',
      );
      expect(screen.queryByTestId('card-deck')).toBeNull();
      expect(screen.queryByTestId('card-deck-hint')).toBeNull();
    });

    it('keeps every card a button that is disabled for assistive technology', async () => {
      await show(discussionDeveloper);

      expect(cards()).toHaveLength(11);
      expect(cards().every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(true);
      expect(cards().every((button) => !button.disabled)).toBe(true);
      expect(cards().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('sends no vote on a click or a key', async () => {
      const user = userEvent.setup();
      const { calls } = await show(discussionDeveloper);

      await user.click(card('5'));
      act(() => card('8').focus());
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      expect(votes(calls)).toHaveLength(0);
    });

    it('still moves the focus with the arrow keys', async () => {
      const user = userEvent.setup();
      await show(discussionDeveloper);
      act(() => card('5').focus());

      await user.keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(card('8'));
    });
  });

  describe('unlock', () => {
    it('unlocks the cards one after another when the deck changes from locked to open', async () => {
      const test = await show(discussionDeveloper);
      expect(unlockIndexes().every((index) => index === null)).toBe(true);

      receiveSnapshot(test, noVote());

      expect(screen.getByTestId('card-deck')).toBeTruthy();
      expect(unlockIndexes()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    });

    it('shows no unlock animation on the first render of an open deck', async () => {
      await show(noVote());

      expect(unlockIndexes().every((index) => index === null)).toBe(true);
    });

    it('shows no unlock animation for a later snapshot of the open deck', async () => {
      const test = await show(noVote());

      receiveSnapshot(test, votingDeveloper);

      expect(unlockIndexes().every((index) => index === null)).toBe(true);
    });

    it('opens the cards without the unlock animation under reduced motion', async () => {
      reducedMotion(true);
      const test = await show(discussionDeveloper);

      receiveSnapshot(test, noVote());

      expect(screen.getByTestId('card-deck')).toBeTruthy();
      expect(unlockIndexes().every((index) => index === null)).toBe(true);
    });
  });
});
