import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionView } from '../api/api';
import {
  discussionDeveloper,
  discussionScrumMaster,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { RoundFooter } from './round-footer';
import {
  SessionPart,
  asViewer,
  receiveSnapshot,
  renderInSession,
  withDeveloper,
  withParticipant,
  withRound,
} from './testing/session-snapshots';

const ID = lobbyScrumMaster.sessionId;

function show(snapshot: SessionView, command?: Answer) {
  return renderInSession(
    <SessionPart render={(session) => <RoundFooter session={session} />} />,
    snapshot,
    command,
  );
}

function commands(calls: readonly FetchCall[]): string[] {
  return calls.filter((call) => call.method !== 'GET').map((call) => `${call.method} ${call.url}`);
}

function held(): { answer: Answer; release: (response: Response) => void } {
  let release: (response: Response) => void = () => undefined;
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { answer: () => response, release: (value) => release(value) };
}

function button(testId: string): HTMLButtonElement {
  return screen.getByTestId<HTMLButtonElement>(testId);
}

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

function allVoted(snapshot: SessionView): SessionView {
  return withRound(withParticipant(snapshot, 'Cem', { hasVoted: true }), { allVoted: true });
}

describe('RoundFooter', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it.each([
    { name: 'LOBBY', snapshot: lobbyScrumMaster },
    { name: 'REVEALED as scrum master', snapshot: revealedScrumMaster },
    { name: 'REVEALED as developer', snapshot: revealedDeveloper },
  ])('shows nothing in $name', async ({ snapshot }) => {
    await show(snapshot);

    expect(screen.queryByTestId('round-footer')).toBeNull();
  });

  describe('scrum master in DISCUSSION', () => {
    it('shows the hint, the timer of the session and Schätzung starten', async () => {
      await show(discussionScrumMaster);

      const hint = screen.getByTestId('discussion-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('Das Team diskutiert das Issue.');
      expect(hint.nextElementSibling?.textContent).toBe(
        'Die Karten sind gesperrt, bis du die Schätzung startest. Timer: 1 min.',
      );
      expect(text('round-start-timer')).toBe('Timer: 1 min');
      expect(text('round-start')).toBe('Schätzung starten');
      expect(button('round-start').getAttribute('data-variant')).toBe('filled');
      expect(screen.queryByTestId('card-deck-locked')).toBeNull();
      expect(screen.queryByTestId('round-reveal')).toBeNull();
    });

    it.each([
      { seconds: 15, label: 'Timer: 15 s' },
      { seconds: 300, label: 'Timer: 5 min' },
      { seconds: 45, label: 'Timer: 45 s' },
    ])('names the timer of $seconds s „$label“', async ({ seconds, label }) => {
      await show({ ...discussionScrumMaster, timerSeconds: seconds });

      expect(text('round-start-timer')).toBe(label);
    });

    it('names no timer without a timer of the session', async () => {
      await show({ ...discussionScrumMaster, timerSeconds: null });

      expect(screen.queryByTestId('round-start-timer')).toBeNull();
      expect(screen.getByTestId('discussion-hint').nextElementSibling?.textContent).toBe(
        'Die Karten sind gesperrt, bis du die Schätzung startest.',
      );
    });

    it('starts the voting once and is disabled until the answer', async () => {
      const user = userEvent.setup();
      const command = held();
      const { calls } = await show(discussionScrumMaster, command.answer);

      await user.click(button('round-start'));

      expect(commands(calls)).toEqual([`POST /api/sessions/${ID}/round/start`]);
      expect(button('round-start').disabled).toBe(true);

      act(() => command.release(new Response(null, { status: 204 })));

      await waitFor(() => expect(button('round-start').disabled).toBe(false));
      expect(commands(calls)).toHaveLength(1);
    });

    it('is enabled again after a failed start', async () => {
      const user = userEvent.setup();
      const { backend } = await show(discussionScrumMaster, () => problem(409, 'INVALID_STATE'));

      await user.click(button('round-start'));

      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));
      await waitFor(() => expect(button('round-start').disabled).toBe(false));
    });
  });

  describe('scrum master in VOTING', () => {
    it('counts one pending vote and offers Auflösen as an outlined button', async () => {
      await show(votingScrumMaster);

      const hint = screen.getByTestId('pending-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('Noch 1 Schätzung ausstehend. Du kannst auch vorher auflösen.');
      expect(text('round-reveal')).toBe('Auflösen');
      expect(button('round-reveal').getAttribute('data-variant')).toBe('outlined');
      expect(button('round-reveal').disabled).toBe(false);
      expect(screen.queryByTestId('all-voted-hint')).toBeNull();
      expect(screen.queryByTestId('round-start')).toBeNull();
    });

    it('counts several pending votes of connected developers', async () => {
      await show(withDeveloper(withDeveloper(votingScrumMaster, 'Dana'), 'Emil', false));

      expect(text('pending-hint')).toBe(
        'Noch 2 Schätzungen ausstehend. Du kannst auch vorher auflösen.',
      );
    });

    it('tells that all voted and offers Auflösen as a filled button', async () => {
      await show(allVoted(votingScrumMaster));

      const hint = screen.getByTestId('all-voted-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('✓ Alle verbundenen Entwickler haben geschätzt.');
      expect(button('round-reveal').getAttribute('data-variant')).toBe('filled');
      expect(screen.queryByTestId('pending-hint')).toBeNull();
      expect(screen.queryByTestId('absent-hint')).toBeNull();
    });

    it.each([
      { names: ['Dana'], hint: 'Dana ist getrennt und wird nicht abgewartet.' },
      {
        names: ['Dana', 'Emil'],
        hint: 'Dana, Emil sind getrennt und werden nicht abgewartet.',
      },
    ])('names the disconnected developers $names without a vote', async ({ names, hint }) => {
      const snapshot = names.reduce(
        (current, name) => withDeveloper(current, name, false),
        allVoted(votingScrumMaster),
      );

      await show(snapshot);

      expect(text('absent-hint')).toBe(hint);
      expect(text('all-voted-hint')).toBe(`✓ Alle verbundenen Entwickler haben geschätzt. ${hint}`);
    });

    it('names no disconnected developer who voted', async () => {
      await show(withParticipant(allVoted(votingScrumMaster), 'Ben', { connected: false }));

      expect(screen.queryByTestId('absent-hint')).toBeNull();
    });

    it('follows the next snapshot from pending to all voted', async () => {
      const test = await show(votingScrumMaster);

      receiveSnapshot(test, allVoted(votingScrumMaster));

      expect(screen.queryByTestId('pending-hint')).toBeNull();
      expect(screen.getByTestId('all-voted-hint')).toBeTruthy();
    });

    it('reveals the round once and is disabled until the answer', async () => {
      const user = userEvent.setup();
      const command = held();
      const { calls } = await show(votingScrumMaster, command.answer);

      await user.click(button('round-reveal'));

      expect(commands(calls)).toEqual([`POST /api/sessions/${ID}/round/reveal`]);
      expect(button('round-reveal').disabled).toBe(true);

      act(() => command.release(new Response(null, { status: 204 })));

      await waitFor(() => expect(button('round-reveal').disabled).toBe(false));
    });

    it('is enabled again after a failed reveal', async () => {
      const user = userEvent.setup();
      await show(votingScrumMaster, () => problem(409, 'INVALID_STATE'));

      await user.click(button('round-reveal'));

      await waitFor(() => expect(button('round-reveal').disabled).toBe(false));
    });
  });

  describe('viewer', () => {
    it.each([
      { name: 'DISCUSSION', snapshot: asViewer(discussionDeveloper) },
      { name: 'VOTING', snapshot: asViewer(votingDeveloper) },
    ])('shows only „Du schaust zu.“ in $name', async ({ snapshot }) => {
      await show(snapshot);

      const hint = screen.getByTestId('viewer-hint');
      expect(hint.getAttribute('role')).toBe('status');
      expect(hint.textContent).toBe('Du schaust zu.');
      expect(screen.getByTestId('round-footer').children).toHaveLength(1);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('developer', () => {
    it('shows the locked deck in DISCUSSION', async () => {
      await show(discussionDeveloper);

      expect(screen.getByTestId('card-deck-locked')).toBeTruthy();
      expect(screen.queryByTestId('card-deck')).toBeNull();
      expect(screen.queryByTestId('round-start')).toBeNull();
      expect(screen.queryByTestId('viewer-hint')).toBeNull();
    });

    it('shows the open deck in VOTING and opens it with the next snapshot', async () => {
      const test = await show(discussionDeveloper);

      receiveSnapshot(test, votingDeveloper);

      expect(screen.getByTestId('card-deck')).toBeTruthy();
      expect(screen.queryByTestId('card-deck-locked')).toBeNull();
      expect(screen.queryByTestId('round-reveal')).toBeNull();
    });
  });
});
