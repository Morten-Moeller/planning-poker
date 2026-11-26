import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SessionView } from '../api/api';
import { lobbyScrumMaster, votingScrumMaster } from '../api/examples';
import { TIMER_SECONDS } from '../api/preferences-store';
import { problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { receiveSnapshot, renderInSession } from './testing/session-snapshots';
import { TIMER_OPTIONS, TimerSetting } from './timer-setting';

const SESSION_ID = lobbyScrumMaster.sessionId;

function withTimer(seconds: number | null): SessionView {
  return { ...lobbyScrumMaster, timerSeconds: seconds };
}

function setup(snapshot: SessionView = lobbyScrumMaster, command?: Answer) {
  return renderInSession(<TimerSetting sessionId={SESSION_ID} />, snapshot, command);
}

function trigger(): HTMLElement {
  return screen.getByTestId('timer-setting');
}

function disabled(): boolean {
  return trigger().hasAttribute('data-disabled');
}

async function choose(seconds: number): Promise<void> {
  const user = userEvent.setup();
  await user.click(trigger());
  await user.click(await screen.findByTestId(`timer-option-${seconds}`));
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

describe('TimerSetting', () => {
  const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations');

  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
  });

  afterAll(() => {
    if (getAnimations === undefined) {
      Reflect.deleteProperty(Element.prototype, 'getAnimations');
    } else {
      Object.defineProperty(Element.prototype, 'getAnimations', getAnimations);
    }
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('is a select of the UI SDK with the label Timer', async () => {
    await setup();

    const select = screen.getByRole('combobox', { name: 'Timer' });
    expect(select).toBe(trigger());
    expect(select.getAttribute('data-slot')).toBe('select-trigger');
  });

  it('keeps the label Timer out of view and shows the value alone in the field', async () => {
    await setup();

    const label = screen.getByText('Timer');
    expect(label.className).toContain('labelHidden');
    expect(trigger().textContent).toBe('Aus');
  });

  it('offers the fixed durations', async () => {
    await setup();

    await userEvent.setup().click(trigger());

    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options.map((option) => option.getAttribute('data-testid'))).toEqual([
      'timer-option-0',
      'timer-option-15',
      'timer-option-30',
      'timer-option-60',
      'timer-option-120',
      'timer-option-300',
    ]);
    expect(options.map((option) => option.textContent)).toEqual([
      'Aus',
      '15 s',
      '30 s',
      '1 min',
      '2 min',
      '5 min',
    ]);
  });

  it('offers exactly the durations the preferences accept', () => {
    expect(TIMER_OPTIONS.map((option) => option.seconds)).toEqual([...TIMER_SECONDS]);
  });

  it('shows the hint that the timer applies from the next round', async () => {
    await setup();

    expect(screen.getByTestId('timer-setting-hint').textContent).toBe(
      'Gilt ab der nächsten Runde.',
    );
  });

  it.each([
    { seconds: null, label: 'Aus' },
    { seconds: 15, label: '15 s' },
    { seconds: 60, label: '1 min' },
    { seconds: 300, label: '5 min' },
  ])('shows $label for timerSeconds $seconds of the snapshot', async ({ seconds, label }) => {
    await setup(withTimer(seconds));

    expect(trigger().textContent).toContain(label);
  });

  it('follows the next snapshot', async () => {
    const test = await setup(withTimer(null));

    receiveSnapshot(test, votingScrumMaster);

    expect(trigger().textContent).toContain('1 min');
  });

  it.each([
    { from: null, choice: 15, seconds: 15 },
    { from: null, choice: 120, seconds: 120 },
    { from: 60, choice: 0, seconds: null },
  ])('sends seconds $seconds for the choice $choice', async ({ from, choice, seconds }) => {
    const test = await setup(withTimer(from));

    await choose(choice);

    await waitFor(() => expect(commands(test.calls)).toHaveLength(1));
    const [call] = commands(test.calls);
    expect(`${call?.method} ${call?.url}`).toBe(`PUT /api/sessions/${SESSION_ID}/timer`);
    expect(call?.body).toEqual({ seconds });
  });

  it('locks the select until the answer and saves the value after it', async () => {
    const pending = held();
    const test = await setup(withTimer(null), pending.answer);

    await choose(30);

    await waitFor(() => expect(disabled()).toBe(true));
    expect(test.backend.preferences.read().timerSeconds).toBe(0);

    await act(async () => {
      pending.release(new Response(null, { status: 204 }));
      await Promise.resolve();
    });

    await waitFor(() => expect(disabled()).toBe(false));
    expect(test.backend.preferences.read().timerSeconds).toBe(30);
  });

  it('saves Aus after a successful change', async () => {
    const test = await setup(withTimer(60));
    test.backend.preferences.save({ timerSeconds: 60 });

    await choose(0);

    await waitFor(() => expect(test.backend.preferences.read().timerSeconds).toBe(0));
  });

  it('does not save the value when the change fails and unlocks the select', async () => {
    const test = await setup(withTimer(null), () => problem(403, 'FORBIDDEN_ROLE'));

    await choose(30);

    await waitFor(() => expect(test.backend.errors.error()?.errorCode).toBe('FORBIDDEN_ROLE'));
    await waitFor(() => expect(disabled()).toBe(false));
    expect(test.backend.preferences.read().timerSeconds).toBe(0);
  });
});
