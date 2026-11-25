import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { votingDeveloper } from '../api/examples';
import { RoundTimer, announces, formatRemaining, remainingSeconds } from './round-timer';
import {
  SessionPart,
  receiveSnapshot,
  renderInSession,
  withRound,
} from './testing/session-snapshots';

const SERVER_TIME = '2026-11-16T09:15:00Z';

function snapshot(secondsLeft: number, serverTime = SERVER_TIME): SessionView {
  const deadline = new Date(Date.parse(serverTime) + secondsLeft * 1000).toISOString();
  return withRound({ ...votingDeveloper, serverTime }, { deadline });
}

function Timer() {
  return (
    <SessionPart
      render={(session) => {
        const deadline = session.round?.deadline ?? null;
        return deadline === null ? null : <RoundTimer deadline={deadline} />;
      }}
    />
  );
}

async function setup(secondsLeft: number) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(SERVER_TIME));
  return renderInSession(<Timer />, snapshot(secondsLeft));
}

function pass(seconds: number): void {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

function timer(): HTMLElement {
  return screen.getByTestId('round-timer');
}

function live(): string {
  return screen.getByTestId('round-timer-live').textContent;
}

describe('round timer functions', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [60, '1:00'],
    [75, '1:15'],
    [300, '5:00'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatRemaining(seconds)).toBe(text);
  });

  it('rounds the rest up to whole seconds and never goes below zero', () => {
    const now = Date.parse(SERVER_TIME);

    expect(remainingSeconds('2026-11-16T09:15:30Z', now)).toBe(30);
    expect(remainingSeconds('2026-11-16T09:15:30Z', now + 100)).toBe(30);
    expect(remainingSeconds('2026-11-16T09:15:30Z', now + 1000)).toBe(29);
    expect(remainingSeconds('2026-11-16T09:15:30Z', now + 31000)).toBe(0);
  });

  it.each([
    [60, true],
    [45, true],
    [44, false],
    [16, false],
    [15, true],
    [11, false],
    [10, true],
    [1, true],
    [0, true],
  ])('announces %i seconds: %s', (seconds, expected) => {
    expect(announces(seconds)).toBe(expected);
  });
});

describe('RoundTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the rest of the time as a timer and counts down every second', async () => {
    await setup(75);

    expect(timer().getAttribute('role')).toBe('timer');
    expect(timer().textContent).toBe('◷ Noch 1:15');
    expect(timer().querySelector('[aria-hidden="true"]')?.textContent).toBe('◷ ');

    pass(1);
    expect(timer().textContent).toBe('◷ Noch 1:14');

    pass(14);
    expect(timer().textContent).toBe('◷ Noch 1:00');
  });

  it('counts with the time of the server, not of the client', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));

    await renderInSession(<Timer />, snapshot(30));

    expect(timer().textContent).toBe('◷ Noch 0:30');
  });

  it('marks the last ten seconds and shows the end of the time', async () => {
    await setup(12);
    expect(timer().className).not.toMatch(/final/);

    pass(2);
    expect(timer().textContent).toBe('◷ Noch 0:10');
    expect(timer().className).toMatch(/final/);

    pass(10);
    expect(timer().textContent).toBe('⏱ Zeit abgelaufen');
    expect(timer().className).not.toMatch(/final/);
    expect(timer().className).toMatch(/expired/);

    pass(5);
    expect(timer().textContent).toBe('⏱ Zeit abgelaufen');
  });

  it('announces the first state, then every 15 seconds and every second of the last ten', async () => {
    await setup(32);
    const region = screen.getByTestId('round-timer-live');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(live()).toBe('Noch 0:32');

    pass(1);
    expect(live()).toBe('Noch 0:32');

    pass(1);
    expect(live()).toBe('Noch 0:30');

    pass(14);
    expect(live()).toBe('Noch 0:30');

    pass(1);
    expect(live()).toBe('Noch 0:15');

    pass(4);
    expect(live()).toBe('Noch 0:15');

    pass(1);
    expect(live()).toBe('Noch 0:10');

    pass(1);
    expect(live()).toBe('Noch 0:09');

    pass(9);
    expect(live()).toBe('Zeit abgelaufen');
  });

  it('starts again with the deadline of a new round', async () => {
    const test = await setup(20);
    pass(5);
    expect(timer().textContent).toBe('◷ Noch 0:15');

    receiveSnapshot(test, snapshot(60, new Date(Date.parse(SERVER_TIME) + 5000).toISOString()));

    expect(timer().textContent).toBe('◷ Noch 1:00');
    expect(live()).toBe('Noch 1:00');
  });

  it('stops the clock when the timer is removed', async () => {
    const test = await setup(20);
    const clear = vi.spyOn(globalThis, 'clearInterval');

    receiveSnapshot(test, withRound(votingDeveloper, { deadline: null }));

    expect(screen.queryByTestId('round-timer')).toBeNull();
    expect(screen.queryByTestId('round-timer-live')).toBeNull();
    expect(clear).toHaveBeenCalled();
  });
});
