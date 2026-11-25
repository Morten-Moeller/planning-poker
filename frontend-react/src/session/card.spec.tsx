import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PokerCard } from './card';
import type { PokerCardProps } from './card';
import type { Card } from './cards';

function show(props: PokerCardProps) {
  const onPick = vi.fn<(card: Card) => void>();
  const view = render(<PokerCard testId="card" onPick={onPick} {...props} />);
  return { onPick, ...view };
}

function card(): HTMLElement {
  return screen.getByTestId('card');
}

function reducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function endAnimation(animationName: string): void {
  for (const type of ['animationend', 'webkitAnimationEnd']) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: animationName });
    fireEvent(card(), event);
  }
}

function wiggles(): boolean {
  return /wiggle/.test(card().className);
}

describe('PokerCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each<[Card, string]>([
    ['5', 'Karte 5'],
    ['?', 'Karte Unklar'],
    ['COFFEE', 'Karte Kaffeepause'],
  ])('is a button named „%s“ → „%s“ while it is open', (value, name) => {
    show({ card: value, state: 'open' });

    expect(card().tagName).toBe('BUTTON');
    expect(card().getAttribute('type')).toBe('button');
    expect(screen.getByRole('button', { name })).toBe(card());
    expect(card().getAttribute('aria-pressed')).toBe('false');
    expect(card().hasAttribute('aria-disabled')).toBe(false);
  });

  it('shows the value of a number card as text hidden from assistive technology', () => {
    show({ card: '13', state: 'open' });

    const value = card().querySelector('[aria-hidden="true"]:not([class*="band"])');
    expect(value?.textContent).toBe('13');
    expect(card().querySelector('svg')).toBeNull();
  });

  it.each<Card>(['?', 'COFFEE'])('shows the drawing for the card %s', (value) => {
    show({ card: value, state: 'open' });

    const svg = card().querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 240 240');
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(5);
    expect(card().textContent).toBe('');
  });

  it('draws different drawings for the two cards', () => {
    const question = show({ card: '?', state: 'open' });
    const first = card().querySelector('svg')?.innerHTML;
    question.unmount();
    show({ card: 'COFFEE', state: 'open' });

    expect(card().querySelector('svg')?.innerHTML).not.toBe(first);
  });

  it('reports a click on an open card', async () => {
    const { onPick } = show({ card: '8', state: 'open' });

    await userEvent.setup().click(card());

    expect(onPick.mock.calls).toEqual([['8']]);
  });

  it('marks the chosen card as pressed with the label GEWÄHLT', () => {
    show({ card: '8', state: 'chosen' });

    expect(card().getAttribute('aria-pressed')).toBe('true');
    expect(card().textContent).toBe('✓ GEWÄHLT8');
    expect(card().querySelector('[aria-hidden="true"]')?.textContent).toBe('✓ GEWÄHLT');
    expect(screen.getByRole('button', { name: 'Karte 8' })).toBe(card());
  });

  it('takes no click while a vote is being sent', async () => {
    const { onPick } = show({ card: '8', state: 'open', busy: true });

    await userEvent.setup().click(card());

    expect(card().getAttribute('aria-disabled')).toBe('true');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('is disabled for assistive technology and reports no click while it is locked', async () => {
    reducedMotion(false);
    const { onPick } = show({ card: '8', state: 'locked' });

    await userEvent.setup().click(card());

    expect(card().tagName).toBe('BUTTON');
    expect(card().getAttribute('aria-disabled')).toBe('true');
    expect(card().hasAttribute('disabled')).toBe(false);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('wiggles on a click and on the first mouse move while it is locked', () => {
    reducedMotion(false);
    show({ card: '8', state: 'locked' });
    expect(wiggles()).toBe(false);

    fireEvent.mouseMove(card());
    expect(wiggles()).toBe(true);

    endAnimation('_wiggle_1x2y3');
    expect(wiggles()).toBe(false);

    fireEvent.mouseMove(card());
    expect(wiggles()).toBe(false);

    fireEvent.mouseLeave(card());
    fireEvent.mouseMove(card());
    expect(wiggles()).toBe(true);

    endAnimation('_wiggle_1x2y3');
    fireEvent.click(card());
    expect(wiggles()).toBe(true);
  });

  it('keeps the wiggle when another animation ends', () => {
    reducedMotion(false);
    show({ card: '8', state: 'locked' });
    fireEvent.click(card());

    endAnimation('_unlock_1x2y3');

    expect(wiggles()).toBe(true);
  });

  it('does not wiggle under reduced motion or while it is open', () => {
    reducedMotion(true);
    const locked = show({ card: '8', state: 'locked' });
    fireEvent.click(card());
    expect(wiggles()).toBe(false);
    locked.unmount();

    reducedMotion(false);
    show({ card: '8', state: 'open' });
    fireEvent.click(card());
    fireEvent.mouseMove(card());
    expect(wiggles()).toBe(false);
  });

  it('stops the wiggle when the card opens', () => {
    reducedMotion(false);
    const { rerender, onPick } = show({ card: '8', state: 'locked' });
    fireEvent.click(card());
    expect(wiggles()).toBe(true);

    rerender(<PokerCard testId="card" card="8" state="open" onPick={onPick} />);

    expect(wiggles()).toBe(false);
  });

  it('carries data-unlock and its place in the row while it unlocks', () => {
    const { rerender } = show({ card: '8', state: 'open', unlockIndex: 3 });

    expect(card().getAttribute('data-unlock')).toBe('true');
    expect(card().style.getPropertyValue('--unlock-index')).toBe('3');

    rerender(<PokerCard testId="card" card="8" state="open" />);

    expect(card().hasAttribute('data-unlock')).toBe(false);
    expect(card().style.getPropertyValue('--unlock-index')).toBe('');
  });

  it('shows a hidden card as an image without a value', () => {
    show({ card: null, state: 'hidden', size: 'seat' });

    expect(card().tagName).toBe('DIV');
    expect(screen.getByRole('img', { name: 'Karte verdeckt' })).toBe(card());
    expect(card().textContent).toBe('');
  });

  it('never shows the value of a hidden card', () => {
    show({ card: '13', state: 'hidden', size: 'seat' });

    expect(card().textContent).toBe('');
    expect(card().getAttribute('aria-label')).toBe('Karte verdeckt');
  });

  it.each([
    { pendingText: undefined, text: '…' },
    { pendingText: 'getrennt', text: 'getrennt' },
    { pendingText: '–', text: '–' },
  ])('shows a pending place with „$text“ and without a role', ({ pendingText, text }) => {
    show({ card: null, state: 'pending', size: 'seat', pendingText });

    expect(card().textContent).toBe(text);
    expect(card().hasAttribute('role')).toBe(false);
    expect(card().hasAttribute('aria-label')).toBe(false);
  });

  it('shows a revealed card as an image with its name', () => {
    show({ card: 'COFFEE', state: 'revealed', size: 'seat' });

    expect(screen.getByRole('img', { name: 'Karte Kaffeepause' })).toBe(card());
    expect(card().querySelector('svg')).not.toBeNull();
    expect(screen.queryByTestId('result-vote-outlier')).toBeNull();
  });

  it('labels an outlier above the card', () => {
    show({ card: '21', state: 'revealed', size: 'seat', outlier: true });

    const label = screen.getByTestId('result-vote-outlier');
    expect(label.textContent).toBe('Ausreißer');
    expect(card().contains(label)).toBe(false);
    expect(card().textContent).toBe('21');
    expect(card().className).toMatch(/outlier/);
  });

  it('turns a revealed card over after its delay', () => {
    const { rerender } = show({
      card: '5',
      state: 'revealed',
      size: 'seat',
      flip: true,
      flipDelay: 80,
    });

    expect(card().className).toMatch(/flip/);
    expect(card().style.animationDelay).toBe('80ms');

    rerender(<PokerCard testId="card" card="5" state="revealed" size="seat" />);

    expect(card().className).not.toMatch(/flip/);
    expect(card().style.animationDelay).toBe('');
  });
});
