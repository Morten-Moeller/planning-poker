import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestBackend, renderWithBackend } from '../api/testing/test-backend';
import { ShareSession } from './share-session';
import type { ShareTarget } from './share-session';

const SESSION_ID = 'K7P2QX9M';
const INVITES = { developer: 'dev-code', viewer: 'view-code' };
const DEVELOPER_LINK = `${window.location.origin}/session/K7P2QX9M/join?invite=dev-code`;
const VIEWER_LINK = `${window.location.origin}/session/K7P2QX9M/join?invite=view-code&as=viewer`;

interface ClipboardDouble {
  written: string[];
  fail: boolean;
  hold: boolean;
  release: () => void;
}

function installClipboard(): ClipboardDouble {
  const double: ClipboardDouble = {
    written: [],
    fail: false,
    hold: false,
    release: () => undefined,
  };
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText(text: string) {
        double.written.push(text);
        if (double.hold) {
          return new Promise<void>((resolve) => {
            double.release = resolve;
          });
        }
        return double.fail ? Promise.reject(new Error('denied')) : Promise.resolve();
      },
    },
  });
  return double;
}

function removeClipboard(): void {
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: undefined });
}

function renderShare(sessionId = SESSION_ID, invites = INVITES) {
  return renderWithBackend(
    <ShareSession sessionId={sessionId} invites={invites} />,
    createTestBackend().backend,
  );
}

async function copy(target: ShareTarget): Promise<void> {
  fireEvent.click(screen.getByTestId(`copy-link-${target}`));
  await act(async () => {
    await Promise.resolve();
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('ShareSession', () => {
  let clipboard: ClipboardDouble;

  beforeEach(() => {
    vi.useFakeTimers();
    clipboard = installClipboard();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeClipboard();
  });

  it('shows the title and names both invite rows', () => {
    renderShare();

    const share = screen.getByTestId('session-share');
    expect(share.querySelector('h2')?.textContent).toBe('Teilen');
    expect(share.textContent).toContain('Einladung Entwickler');
    expect(share.textContent).toContain('Einladung Zuschauer');
  });

  it('shows both invite links with the code from the origin of the page', () => {
    renderShare();

    expect(screen.getByTestId('share-link-developer').textContent).toBe(DEVELOPER_LINK);
    expect(screen.getByTestId('share-link-viewer').textContent).toBe(VIEWER_LINK);
  });

  it('encodes the session id and the code in the link', () => {
    renderShare('A B/C', { developer: 'a&b=c d', viewer: 'x?y#z' });

    const origin = window.location.origin;
    expect(screen.getByTestId('share-link-developer').textContent).toBe(
      `${origin}/session/A%20B%2FC/join?invite=a%26b%3Dc%20d`,
    );
    expect(screen.getByTestId('share-link-viewer').textContent).toBe(
      `${origin}/session/A%20B%2FC/join?invite=x%3Fy%23z&as=viewer`,
    );
  });

  it.each([
    { target: 'developer', name: 'Einladung Entwickler kopieren' },
    { target: 'viewer', name: 'Einladung Zuschauer kopieren' },
  ] as const)('names the copy button of the $target link', ({ target, name }) => {
    renderShare();

    const button = screen.getByRole('button', { name });
    expect(button.getAttribute('data-testid')).toBe(`copy-link-${target}`);
    expect(button.textContent).toBe('⧉ Kopieren');
    const symbol = button.querySelector('.app-symbol');
    expect(symbol?.textContent).toBe('⧉');
    expect(symbol?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no copy button without a clipboard', () => {
    removeClipboard();

    renderShare();

    expect(screen.queryByTestId('copy-link-developer')).toBeNull();
    expect(screen.queryByTestId('copy-link-viewer')).toBeNull();
    expect(screen.getByTestId('share-link-developer').textContent).toBe(DEVELOPER_LINK);
  });

  it.each([
    { target: 'developer', other: 'viewer', link: DEVELOPER_LINK },
    { target: 'viewer', other: 'developer', link: VIEWER_LINK },
  ] as const)('copies the $target link and shows Kopiert', async ({ target, other, link }) => {
    renderShare();

    await copy(target);

    expect(clipboard.written).toEqual([link]);
    const done = screen.getByTestId(`copy-link-${target}-done`);
    expect(done.textContent).toBe('Kopiert');
    expect(done.getAttribute('role')).toBe('status');
    expect(done.previousElementSibling?.textContent).toBe('✓ ');
    expect(done.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByTestId(`copy-link-${other}-done`)).toBeNull();
  });

  it('hides Kopiert 3 s after the copy', async () => {
    renderShare();
    await copy('developer');

    advance(2999);
    expect(screen.queryByTestId('copy-link-developer-done')).not.toBeNull();

    advance(1);
    expect(screen.queryByTestId('copy-link-developer-done')).toBeNull();
  });

  it('starts the 3 s again with a second click', async () => {
    renderShare();
    await copy('developer');
    advance(2000);

    await copy('developer');
    advance(2999);
    expect(screen.queryByTestId('copy-link-developer-done')).not.toBeNull();

    advance(1);
    expect(screen.queryByTestId('copy-link-developer-done')).toBeNull();
  });

  it('shows the failure text and keeps it', async () => {
    clipboard.fail = true;
    renderShare();

    await copy('viewer');
    advance(60000);

    const failed = screen.getByTestId('copy-link-viewer-failed');
    expect(failed.textContent).toBe('Kopieren nicht möglich, bitte von Hand kopieren');
    expect(failed.getAttribute('role')).toBe('status');
    expect(failed.previousElementSibling?.textContent).toBe('⚠ ');
    expect(screen.queryByTestId('copy-link-viewer-done')).toBeNull();
  });

  it('replaces Kopiert by the failure text and the failure text by Kopiert', async () => {
    renderShare();
    await copy('developer');

    clipboard.fail = true;
    await copy('developer');
    expect(screen.queryByTestId('copy-link-developer-done')).toBeNull();
    expect(screen.queryByTestId('copy-link-developer-failed')).not.toBeNull();

    clipboard.fail = false;
    await copy('developer');
    expect(screen.queryByTestId('copy-link-developer-failed')).toBeNull();
    expect(screen.queryByTestId('copy-link-developer-done')).not.toBeNull();
  });

  it('starts no timer when the copy ends after the part is removed', async () => {
    clipboard.hold = true;
    const view = renderShare();
    await copy('developer');
    view.unmount();
    const timers = vi.getTimerCount();

    await act(async () => {
      clipboard.release();
      await Promise.resolve();
    });

    expect(clipboard.written).toEqual([DEVELOPER_LINK]);
    expect(vi.getTimerCount()).toBe(timers);
  });

  it('shows Neue Sitzung as an outlined link to the start page at the end', () => {
    renderShare();

    const link = screen.getByTestId('new-session');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/');
    expect(link.textContent).toBe('＋ Neue Sitzung');
    expect(link.getAttribute('data-variant')).toBe('outlined');
    expect(screen.getByTestId('session-share').lastElementChild).toBe(link);
  });
});
