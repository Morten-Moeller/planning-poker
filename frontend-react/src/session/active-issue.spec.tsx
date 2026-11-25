import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionView } from '../api/api';
import { ActiveIssue } from './active-issue';
import type { IssueView } from './active-issue';
import { NARROW_LAYOUT } from './use-narrow';

const ISSUE: IssueView = {
  iid: 42,
  title: 'Login page',
  description: 'As a user I want to **log in**.\n\n- form\n- validation',
  webUrl: 'https://gitlab.example/group/project/-/issues/42',
};

type Phase = SessionView['phase'];

function narrowWindow(narrow: boolean): string[] {
  const queries: string[] = [];
  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query);
    return {
      matches: narrow,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  });
  return queries;
}

function show(issue: IssueView = ISSUE, phase: Phase = 'DISCUSSION') {
  return render(<ActiveIssue issue={issue} phase={phase} />);
}

function frame(): HTMLElement {
  const parent = screen.getByTestId('active-issue-description').parentElement;
  if (parent === null) {
    throw new Error('the description has no frame');
  }
  return parent;
}

function collapsed(): boolean {
  return screen.queryByTestId('active-issue-expand') !== null;
}

describe('ActiveIssue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the number, the title as a heading and the link to GitLab', () => {
    show();

    const section = screen.getByTestId('active-issue');
    expect(screen.getByTestId('active-issue-iid').textContent).toBe('#42');
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toBe(screen.getByTestId('active-issue-title'));
    expect(title.textContent).toBe('Login page');
    const link = screen.getByTestId('active-issue-link');
    expect(link.getAttribute('href')).toBe('https://gitlab.example/group/project/-/issues/42');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(link.textContent).toBe('In GitLab öffnen ↗');
    const symbol = link.querySelector('.app-symbol');
    expect(symbol?.textContent).toBe('↗');
    expect(symbol?.getAttribute('aria-hidden')).toBe('true');
    expect(section.contains(link)).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', '/group/project/-/issues/42', ''])(
    'shows no link for the address „%s“',
    (webUrl) => {
      show({ ...ISSUE, webUrl });

      expect(screen.queryByTestId('active-issue-link')).toBeNull();
      expect(screen.getByTestId('active-issue-title').textContent).toBe('Login page');
    },
  );

  it('shows the description as HTML of the markdown', () => {
    show();

    const description = screen.getByTestId('active-issue-description');
    expect(description.id).toBe('active-issue-description');
    expect(description.querySelector('strong')?.textContent).toBe('log in');
    expect(description.querySelectorAll('li')).toHaveLength(2);
  });

  it('removes script content from the description', () => {
    show({
      ...ISSUE,
      description:
        '**fett**\n\n<script>window.__pwned = true</script>\n\n<img src="x" onerror="window.__pwned = true" alt="Bild">\n\n[Klick](javascript:alert(1))',
    });

    const description = screen.getByTestId('active-issue-description');
    expect(description.querySelector('strong')?.textContent).toBe('fett');
    expect(description.querySelector('script')).toBeNull();
    expect(description.querySelector('[onerror]')).toBeNull();
    expect(description.innerHTML).not.toMatch(/javascript:/i);
    expect((window as unknown as { __pwned?: unknown }).__pwned).toBeUndefined();
  });

  it.each<Phase>(['LOBBY', 'DISCUSSION', 'VOTING'])(
    'shows the whole description in %s in a wide window',
    (phase) => {
      narrowWindow(false);
      show(ISSUE, phase);

      expect(collapsed()).toBe(false);
      expect(screen.queryByTestId('active-issue-collapse')).toBeNull();
      expect(frame().className).not.toContain('collapsed');
    },
  );

  it('collapses the description in REVEALED and opens and closes it', async () => {
    const user = userEvent.setup();
    narrowWindow(false);
    show(ISSUE, 'REVEALED');

    const expand = screen.getByTestId('active-issue-expand');
    expect(expand.textContent).toBe('▾ Ganze Beschreibung anzeigen');
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(expand.getAttribute('aria-controls')).toBe('active-issue-description');
    expect(expand.querySelector('[aria-hidden="true"]')?.textContent).toBe('▾');
    expect(frame().className).toContain('collapsed');

    await user.click(expand);

    const collapse = screen.getByTestId('active-issue-collapse');
    expect(collapse.textContent).toBe('▴ Beschreibung einklappen');
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(collapse.getAttribute('aria-controls')).toBe('active-issue-description');
    expect(screen.queryByTestId('active-issue-expand')).toBeNull();
    expect(frame().className).not.toContain('collapsed');

    await user.click(collapse);

    expect(collapsed()).toBe(true);
    expect(frame().className).toContain('collapsed');
  });

  it.each<Phase>(['DISCUSSION', 'VOTING'])(
    'collapses the description in %s in a narrow window',
    (phase) => {
      const queries = narrowWindow(true);
      show(ISSUE, phase);

      expect(collapsed()).toBe(true);
      expect(queries).toContain(NARROW_LAYOUT);
      expect(NARROW_LAYOUT).toBe('(max-width: 719.98px)');
    },
  );

  it.each(['', '   ', '\n\n'])('offers nothing to open for the empty description „%s“', (text) => {
    narrowWindow(true);
    show({ ...ISSUE, description: text }, 'REVEALED');

    expect(collapsed()).toBe(false);
    expect(screen.queryByTestId('active-issue-collapse')).toBeNull();
    expect(frame().className).not.toContain('collapsed');
  });

  it('collapses again for another issue', async () => {
    const user = userEvent.setup();
    narrowWindow(false);
    const view = show(ISSUE, 'REVEALED');
    await user.click(screen.getByTestId('active-issue-expand'));
    expect(collapsed()).toBe(false);

    view.rerender(<ActiveIssue issue={{ ...ISSUE, iid: 43 }} phase="REVEALED" />);

    expect(collapsed()).toBe(true);
  });

  it('collapses again when the same phase comes back', async () => {
    const user = userEvent.setup();
    narrowWindow(false);
    const view = show(ISSUE, 'REVEALED');
    await user.click(screen.getByTestId('active-issue-expand'));

    view.rerender(<ActiveIssue issue={ISSUE} phase="VOTING" />);
    expect(collapsed()).toBe(false);
    expect(screen.queryByTestId('active-issue-collapse')).toBeNull();

    view.rerender(<ActiveIssue issue={ISSUE} phase="REVEALED" />);

    expect(collapsed()).toBe(true);
  });
});
