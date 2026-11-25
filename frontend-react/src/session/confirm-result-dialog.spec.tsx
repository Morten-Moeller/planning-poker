import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { revealedScrumMaster } from '../api/examples';
import { problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import type { Card } from './cards';
import { ConfirmResultDialog } from './confirm-result-dialog';
import type { ConfirmSuccessData } from './confirm-success';
import { confirmSuccessText } from './confirm-success';
import { installPopupAnimations } from './testing/popup-animations';
import {
  SessionPart,
  receiveSnapshot,
  renderInSession,
  withRound,
} from './testing/session-snapshots';

const ID = revealedScrumMaster.sessionId;
const NAMES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', 'Unklar', 'Kaffeepause'];

async function show(
  snapshot: SessionView = revealedScrumMaster,
  suggestedCard: Card | null = null,
  command?: Answer,
) {
  const onClose = vi.fn<() => void>();
  const onConfirmed = vi.fn<(data: ConfirmSuccessData) => void>();
  const test = await renderInSession(
    <SessionPart
      render={(session) => (
        <ConfirmResultDialog
          session={session}
          suggestedCard={suggestedCard}
          onClose={onClose}
          onConfirmed={onConfirmed}
        />
      )}
    />,
    snapshot,
    command,
  );
  await screen.findByTestId('confirm-dialog');
  return { ...test, onClose, onConfirmed };
}

function radios(): HTMLElement[] {
  return screen
    .getAllByRole('radio', { hidden: true })
    .filter((element) => element.getAttribute('data-slot') === 'radio');
}

function radio(name: string): HTMLElement {
  return screen.getByRole('radio', { name, hidden: true });
}

function checked(): string[] {
  return radios()
    .filter((element) => element.getAttribute('aria-checked') === 'true')
    .map((element) => element.getAttribute('aria-label') ?? '');
}

function option(name: string): HTMLElement {
  const label = radio(name).closest<HTMLElement>('[data-testid="confirm-card"]');
  if (label === null) {
    throw new Error(`no option for ${name}`);
  }
  return label;
}

function button(testId: string): HTMLButtonElement {
  return screen.getByTestId<HTMLButtonElement>(testId);
}

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

function commands(calls: readonly FetchCall[]): FetchCall[] {
  return calls.filter((call) => call.method !== 'GET');
}

function held(): { answer: Answer; release: (response: Response) => void } {
  let release: (response: Response) => void = () => undefined;
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { answer: () => response, release: (value) => release(value) };
}

describe('ConfirmResultDialog', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('content', () => {
    it('is a dialog of the UI SDK with the title and the issue', async () => {
      await show();

      const dialog = screen.getByTestId('confirm-dialog');
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('data-slot')).toBe('dialog-content');
      const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
      expect(title?.textContent).toBe('Ergebnis übernehmen');
      expect(text('confirm-issue')).toBe('#42 Login page');
      expect(text('confirm-lead')).toBe(
        'Endwert für #42 Login page. Kein Konsens, deshalb ist nichts vorausgewählt.',
      );
    });

    it('offers the eleven cards as radios named by the card', async () => {
      await show();

      const group = screen.getByRole('radiogroup', { name: 'Endwert', hidden: true });
      expect(within(group).getAllByTestId('confirm-card')).toHaveLength(11);
      expect(radios().map((element) => element.getAttribute('aria-label'))).toEqual(NAMES);
      expect(checked()).toEqual([]);
      expect(button('confirm-submit').disabled).toBe(true);
      expect(text('confirm-submit')).toBe('Übernehmen');
      expect(text('confirm-cancel')).toBe('Abbrechen');
    });

    it('shows the votes per card and marks the most frequent values without a consensus', async () => {
      await show(
        withRound(revealedScrumMaster, {
          stats: {
            distribution: [
              { card: '5', count: 2 },
              { card: '8', count: 1 },
            ],
            average: 6,
            mostFrequent: ['5'],
          },
        }),
      );

      const five = within(option('5')).getByTestId('confirm-card-votes');
      expect(five.querySelector('[aria-hidden="true"]')?.textContent).toBe('2×');
      const fiveText = document.getElementById(radio('5').getAttribute('aria-describedby') ?? '');
      expect(fiveText?.textContent).toBe('2 Stimmen, häufigster Wert');
      const eightText = document.getElementById(radio('8').getAttribute('aria-describedby') ?? '');
      expect(eightText?.textContent).toBe('1 Stimme');
      expect(within(option('13')).getByTestId('confirm-card-votes').textContent).toBe('');
      expect(radio('13').hasAttribute('aria-describedby')).toBe(false);
      expect(option('5').className).toMatch(/mostFrequent/);
      expect(option('8').className).not.toMatch(/mostFrequent/);
      expect(text('confirm-legend')).toBe(
        'Häufigster Wert dieser Runde, darunter die Anzahl der Stimmen. Nur zur Orientierung.',
      );
    });

    it('preselects the consensus and marks no most frequent value', async () => {
      await show(revealedScrumMaster, '5');

      expect(checked()).toEqual(['5']);
      expect(text('confirm-lead')).toBe(
        'Endwert für #42 Login page. Konsens: 5 ist vorausgewählt.',
      );
      expect(option('5').className).toMatch(/selected/);
      expect(option('5').textContent).toContain('✓ 5');
      expect(option('8').className).not.toMatch(/mostFrequent/);
      expect(screen.queryByTestId('confirm-legend')).toBeNull();
      expect(button('confirm-submit').disabled).toBe(false);
    });

    it.each([
      {
        writeWeight: true,
        note: 'ⓘIns GitLab-Issue #42 wird ein Kommentar mit dem Endwert geschrieben. Zahlenwerte werden zusätzlich als Gewicht gesetzt.',
      },
      {
        writeWeight: false,
        note: 'ⓘIns GitLab-Issue #42 wird ein Kommentar mit dem Endwert geschrieben. Das Gewicht des Issues bleibt unverändert.',
      },
    ])('tells what is written with writeWeight $writeWeight', async ({ writeWeight, note }) => {
      await show({ ...revealedScrumMaster, writeWeight });

      expect(text('confirm-note')).toBe(note);
    });
  });

  it('follows a later snapshot while it is open and keeps the choice', async () => {
    const user = userEvent.setup();
    const test = await show({ ...revealedScrumMaster, writeWeight: false });
    await user.click(radio('8'));
    expect(text('confirm-note')).toContain('Das Gewicht des Issues bleibt unverändert.');

    receiveSnapshot(
      test,
      withRound(
        { ...revealedScrumMaster, writeWeight: true },
        {
          stats: { distribution: [{ card: '13', count: 3 }], average: 13, mostFrequent: ['13'] },
        },
      ),
    );

    expect(text('confirm-note')).toContain('Zahlenwerte werden zusätzlich als Gewicht gesetzt.');
    expect(within(option('13')).getByTestId('confirm-card-votes').textContent).toContain('3×');
    expect(within(option('5')).getByTestId('confirm-card-votes').textContent).toBe('');
    expect(checked()).toEqual(['8']);
  });

  describe('choice', () => {
    it('chooses a card with a click and enables Übernehmen', async () => {
      const user = userEvent.setup();
      await show();

      await user.click(radio('8'));

      expect(checked()).toEqual(['8']);
      expect(option('8').className).toMatch(/selected/);
      expect(button('confirm-submit').disabled).toBe(false);

      await user.click(radio('Kaffeepause'));

      expect(checked()).toEqual(['Kaffeepause']);
    });

    it('closes without a request on Abbrechen', async () => {
      const user = userEvent.setup();
      const { calls, onClose, onConfirmed } = await show(revealedScrumMaster, '5');

      await user.click(button('confirm-cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirmed).not.toHaveBeenCalled();
      expect(commands(calls)).toHaveLength(0);
    });

    it('closes without a request on Escape', async () => {
      const user = userEvent.setup();
      const { calls, onClose } = await show(revealedScrumMaster, '5');

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(commands(calls)).toHaveLength(0);
    });
  });

  describe('sending', () => {
    it('sends the chosen card and locks the dialog until the answer', async () => {
      const user = userEvent.setup();
      const command = held();
      const { calls, onClose, onConfirmed } = await show(revealedScrumMaster, null, command.answer);
      await user.click(radio('8'));

      await user.click(button('confirm-submit'));

      expect(commands(calls).map((call) => [call.method, call.url, call.body])).toEqual([
        ['POST', `/api/sessions/${ID}/round/confirm`, { card: '8' }],
      ]);
      const writing = screen.getByTestId('confirm-writing');
      expect(writing.getAttribute('role')).toBe('status');
      expect(writing.textContent).toBe('Das Ergebnis wird nach GitLab geschrieben …');
      const bar = within(writing).getByRole('progressbar', { hidden: true });
      expect(bar.hasAttribute('aria-valuenow')).toBe(false);
      expect(text('confirm-submit')).toBe('Wird übernommen …');
      expect(button('confirm-submit').disabled).toBe(true);
      expect(button('confirm-cancel').disabled).toBe(true);
      expect(
        radios().every(
          (element) =>
            element.hasAttribute('data-disabled') ||
            element.getAttribute('aria-disabled') === 'true',
        ),
      ).toBe(true);

      await user.keyboard('{Escape}');
      await user.click(button('confirm-submit'));

      expect(onClose).not.toHaveBeenCalled();
      expect(commands(calls)).toHaveLength(1);

      act(() => command.release(new Response(null, { status: 204 })));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(onConfirmed.mock.calls).toEqual([
        [{ card: '8', issueIid: 42, webUrl: revealedScrumMaster.activeIssue?.webUrl }],
      ]);
    });

    it('sends a card without a number as its value of the contract', async () => {
      const user = userEvent.setup();
      const { calls, onConfirmed } = await show();

      await user.click(radio('Unklar'));
      await user.click(button('confirm-submit'));

      await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1));
      expect(commands(calls)[0]?.body).toEqual({ card: '?' });
    });

    it.each([
      {
        code: 'GITLAB_ERROR',
        message: 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
      },
      {
        code: 'GITLAB_ACCESS_DENIED',
        message:
          'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
      },
    ])('keeps the dialog open with the error $code', async ({ code, message }) => {
      const user = userEvent.setup();
      const { backend, onClose, onConfirmed } = await show(revealedScrumMaster, null, () =>
        problem(502, code),
      );
      await user.click(radio('8'));

      await user.click(button('confirm-submit'));

      const error = await screen.findByTestId('confirm-error');
      expect(error.getAttribute('role')).toBe('alert');
      expect(text('confirm-error-message')).toBe(message);
      expect(text('confirm-error')).toBe(
        `⚠${message} Der Kommentar wurde nicht geschrieben. Prüfe das Token und versuche es erneut.`,
      );
      expect(error.textContent).not.toContain('Detail of the API.');
      expect(backend.errors.error()).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
      expect(onConfirmed).not.toHaveBeenCalled();
      expect(checked()).toEqual(['8']);
      expect(text('confirm-submit')).toBe('Erneut versuchen');
      expect(button('confirm-submit').disabled).toBe(false);
      expect(button('confirm-cancel').disabled).toBe(false);
      expect(screen.queryByTestId('confirm-writing')).toBeNull();
    });

    it('confirms with the second attempt after an error', async () => {
      const user = userEvent.setup();
      let attempt = 0;
      const { calls, onConfirmed } = await show(revealedScrumMaster, null, () => {
        attempt += 1;
        return attempt === 1 ? problem(502, 'GITLAB_ERROR') : new Response(null, { status: 204 });
      });
      await user.click(radio('8'));
      await user.click(button('confirm-submit'));
      await screen.findByTestId('confirm-error');

      await user.click(button('confirm-submit'));

      await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1));
      expect(commands(calls).map((call) => call.body)).toEqual([{ card: '8' }, { card: '8' }]);
    });

    it('leaves another error code to the banner and unlocks the dialog', async () => {
      const user = userEvent.setup();
      const { backend, onClose } = await show(revealedScrumMaster, '5', () =>
        problem(409, 'INVALID_STATE'),
      );

      await user.click(button('confirm-submit'));

      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));
      await waitFor(() => expect(button('confirm-submit').disabled).toBe(false));
      expect(screen.queryByTestId('confirm-error')).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe('confirmSuccessText', () => {
  it.each<[Card, string]>([
    ['8', '✓ Endwert 8 in GitLab-Issue #42 gespeichert.'],
    ['?', '✓ Endwert Unklar in GitLab-Issue #42 gespeichert.'],
    ['COFFEE', '✓ Endwert Kaffeepause in GitLab-Issue #42 gespeichert.'],
  ])('names the card %s', (card, message) => {
    expect(confirmSuccessText({ card, issueIid: 42, webUrl: null })).toBe(message);
  });

  it('leaves out the issue when there is none', () => {
    expect(confirmSuccessText({ card: '5', issueIid: null, webUrl: null })).toBe(
      '✓ Endwert 5 in GitLab gespeichert.',
    );
  });
});
