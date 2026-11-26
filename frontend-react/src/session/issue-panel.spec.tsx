import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { IssueListResponse, SessionView } from '../api/api';
import {
  discussionScrumMaster,
  lobbyScrumMaster,
  revealedScrumMaster,
  votingScrumMaster,
} from '../api/examples';
import { problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { IssuePanel } from './issue-panel';
import { installPopupAnimations } from './testing/popup-animations';
import {
  isIssueList,
  issuePage,
  receiveSnapshot,
  renderInSession,
} from './testing/session-snapshots';
import { useSession } from './use-session';

type Issue = IssueListResponse['items'][number];

const ID = lobbyScrumMaster.sessionId;
const PREFERENCES = 'planningpoker.preferences';

function issue(iid: number, title: string, weight: number | null = null): Issue {
  return { iid, title, weight, webUrl: `https://gitlab.example/group/project/-/issues/${iid}` };
}

const LOGIN = issue(42, 'Login page');
const RESET = issue(43, 'Password reset');
const ESTIMATED = issue(46, 'Estimated issue', 3);
const ISSUES = [LOGIN, RESET, ESTIMATED];

function Panel() {
  const session = useSession();
  return session === null ? null : <IssuePanel session={session} />;
}

interface Options {
  issues?: Answer;
  command?: Answer;
}

async function setup(snapshot: SessionView = lobbyScrumMaster, options: Options = {}) {
  const test = await renderInSession(
    <Panel />,
    snapshot,
    options.command,
    options.issues ?? (() => issuePage(ISSUES)),
  );
  await screen.findByTestId('issue-panel');
  return test;
}

function queryOf(call: FetchCall): Record<string, string> {
  return Object.fromEntries(new URL(call.url, 'http://localhost').searchParams);
}

function listQueries(calls: readonly FetchCall[]): Record<string, string>[] {
  return calls.filter(isIssueList).map(queryOf);
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

function inSequence(...answers: Answer[]): Answer {
  let index = 0;
  return (call) => {
    const answer = answers[Math.min(index, answers.length - 1)];
    index += 1;
    if (answer === undefined) {
      throw new Error('no answer for the issue list');
    }
    return answer(call);
  };
}

function rows(): HTMLElement[] {
  return screen.queryAllByTestId('issue-result');
}

function row(iid: number): HTMLElement {
  const found = rows().find((entry) => entry.textContent.includes(`#${iid} `));
  if (found === undefined) {
    throw new Error(`no row for issue ${iid}`);
  }
  return found;
}

async function shown(count: number): Promise<void> {
  await waitFor(() => expect(rows()).toHaveLength(count));
}

function release(): HTMLButtonElement {
  return screen.getByTestId<HTMLButtonElement>('issue-release');
}

function text(testId: string): string {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

function savePreferences(values: Record<string, string>): void {
  localStorage.setItem(PREFERENCES, JSON.stringify(values));
}

function confirming(snapshot: SessionView): SessionView {
  return {
    ...snapshot,
    round: snapshot.round === null ? null : { ...snapshot.round, confirming: true },
  };
}

function withActiveIssue(snapshot: SessionView, iid: number, title: string): SessionView {
  return {
    ...snapshot,
    activeIssue: snapshot.activeIssue === null ? null : { ...snapshot.activeIssue, iid, title },
  };
}

describe('IssuePanel', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('head', () => {
    it('has the heading and names the project of GitLab with its id', async () => {
      await setup();

      const panel = screen.getByTestId('issue-panel');
      expect(within(panel).getByRole('heading', { level: 2 }).textContent).toBe('Issue auswählen');
      expect(text('issue-panel-project')).toBe('Projekt: Frontend · 1234');
    });

    it('names the project id alone without a project in the snapshot', async () => {
      await setup({ ...lobbyScrumMaster, project: null });

      expect(text('issue-panel-project')).toBe('Projekt: 1234');
    });
  });

  describe('list', () => {
    it('loads the first page with the default filters', async () => {
      const { calls } = await setup();
      await shown(3);

      const lists = calls.filter(isIssueList);
      expect(lists).toHaveLength(1);
      expect(lists[0]?.url.startsWith(`/api/sessions/${ID}/issues?`)).toBe(true);
      expect(lists[0]?.headers['Authorization']).toBe('Bearer token-of-the-test');
      expect(listQueries(calls)).toEqual([{ weight: 'NONE', period: 'ALL' }]);
    });

    it('loads with the filters that the browser keeps', async () => {
      savePreferences({ weightFilter: 'ANY', periodFilter: 'MONTH' });

      const { calls } = await setup();
      await shown(3);

      expect(listQueries(calls)).toEqual([{ weight: 'ANY', period: 'MONTH' }]);
      expect(screen.getByTestId('issue-filter-weight-any').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(text('issue-filter-period')).toBe('1 Monat');
    });

    it('shows every issue as a button with number, title and weight', async () => {
      await setup();
      await shown(3);

      expect(rows().map((entry) => entry.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON']);
      expect(rows().map((entry) => entry.textContent.replace(/\s+/g, ' ').trim())).toEqual([
        '✓ #42 Login page ohne Gewicht',
        '#43 Password reset ohne Gewicht',
        '#46 Estimated issue Gewicht 3',
      ]);
      expect(
        screen.getAllByTestId('issue-result-weight').map((weight) => weight.textContent),
      ).toEqual(['ohne Gewicht', 'ohne Gewicht', 'Gewicht 3']);
      expect(screen.getByRole('list').children).toHaveLength(3);
    });

    it('marks the chosen issue with aria-pressed and a check mark', async () => {
      const user = userEvent.setup();
      await setup();
      await shown(3);

      expect(rows().map((entry) => entry.getAttribute('aria-pressed'))).toEqual([
        'true',
        'false',
        'false',
      ]);
      expect(row(42).querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
      expect(row(43).querySelector('[aria-hidden="true"]')?.textContent).toBe('');

      await user.click(row(43));

      expect(rows().map((entry) => entry.getAttribute('aria-pressed'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      expect(row(43).querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
    });

    it.each([
      { name: 'the total', items: ISSUES, total: 3, count: '3 von 3 Issues' },
      { name: 'a larger total', items: [LOGIN, RESET], total: 23, count: '2 von 23 Issues' },
      { name: 'one issue without a total', items: [LOGIN], total: null, count: '1 Issue' },
      { name: 'two issues without a total', items: [LOGIN, RESET], total: null, count: '2 Issues' },
    ])('counts the issues against $name', async ({ items, total, count }) => {
      await setup(lobbyScrumMaster, { issues: () => issuePage(items, null, total) });
      await shown(items.length);

      expect(text('issue-count')).toBe(count);
    });

    it('offers Mehr laden only with a next page and appends its issues', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(lobbyScrumMaster, {
        issues: (call) =>
          queryOf(call)['page'] === '2'
            ? issuePage([ESTIMATED], null, 3)
            : issuePage([LOGIN, RESET], 2, 3),
      });
      await shown(2);
      expect(text('issue-count')).toBe('2 von 3 Issues');
      const more = screen.getByTestId('issue-load-more');
      expect(more.textContent).toBe('Mehr laden');

      await user.click(more);
      await shown(3);

      expect(rows().map((entry) => entry.getAttribute('aria-pressed'))).toEqual([
        'true',
        'false',
        'false',
      ]);
      expect(listQueries(calls)).toEqual([
        { weight: 'NONE', period: 'ALL' },
        { weight: 'NONE', period: 'ALL', page: '2' },
      ]);
      expect(text('issue-count')).toBe('3 von 3 Issues');
      expect(screen.queryByTestId('issue-load-more')).toBeNull();
    });

    it('shows the empty state with Filter zurücksetzen without a hit', async () => {
      await setup(lobbyScrumMaster, { issues: () => issuePage([]) });

      const empty = await screen.findByTestId('issue-results-empty');
      expect(empty.textContent).toBe('Keine Issues gefunden');
      expect(empty.parentElement?.getAttribute('role')).toBe('status');
      expect(text('issue-filter-reset')).toBe('Filter zurücksetzen');
      expect(screen.queryByTestId('issue-count')).toBeNull();
      expect(screen.queryByTestId('issue-load-more')).toBeNull();
      expect(screen.queryByRole('list')).toBeNull();
    });

    it('shows no empty state while the first page loads', async () => {
      const first = held();
      await setup(lobbyScrumMaster, { issues: first.answer });

      expect(screen.queryByTestId('issue-results-empty')).toBeNull();

      act(() => first.release(issuePage([])));

      expect(await screen.findByTestId('issue-results-empty')).toBeTruthy();
    });
  });

  describe('search and filters', () => {
    it('searches with the text without the spaces around it', async () => {
      const user = userEvent.setup();
      const { calls } = await setup();
      await shown(3);
      const input = screen.getByTestId<HTMLInputElement>('issue-search-input');
      expect(input.type).toBe('search');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(screen.getByLabelText('Issues suchen')).toBe(input);
      expect(text('issue-search-submit')).toBe('Suchen');

      await user.type(input, '  log in ');
      await user.click(screen.getByTestId('issue-search-submit'));

      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      expect(listQueries(calls)[1]).toEqual({ search: 'log in', weight: 'NONE', period: 'ALL' });
    });

    it('searches on Enter and without a text again without search', async () => {
      const user = userEvent.setup();
      const { calls } = await setup();
      await shown(3);
      const input = screen.getByTestId('issue-search-input');

      await user.type(input, 'reset{Enter}');
      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      await user.clear(input);
      await user.type(input, '   {Enter}');

      await waitFor(() => expect(listQueries(calls)).toHaveLength(3));
      expect(listQueries(calls)[1]).toEqual({ search: 'reset', weight: 'NONE', period: 'ALL' });
      expect(listQueries(calls)[2]).toEqual({ weight: 'NONE', period: 'ALL' });
    });

    it('keeps the search for a filter change and for the next page', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(lobbyScrumMaster, {
        issues: () => issuePage([LOGIN], 2, 5),
      });
      await shown(1);

      await user.type(screen.getByTestId('issue-search-input'), 'page{Enter}');
      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      await user.click(screen.getByTestId('issue-filter-weight-all'));
      await waitFor(() => expect(listQueries(calls)).toHaveLength(3));
      await user.click(screen.getByTestId('issue-load-more'));
      await waitFor(() => expect(listQueries(calls)).toHaveLength(4));

      expect(listQueries(calls)[2]).toEqual({ search: 'page', weight: 'ALL', period: 'ALL' });
      expect(listQueries(calls)[3]).toEqual({
        search: 'page',
        weight: 'ALL',
        period: 'ALL',
        page: '2',
      });
    });

    it('offers the weight filter as a segmented control of the UI SDK', async () => {
      await setup();

      const group = screen.getByTestId('issue-filter-weight');
      expect(group.getAttribute('data-slot')).toBe('segmented-control');
      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-label')).toBe('Filter nach Gewicht');
      const radios = within(group).getAllByRole('radio');
      expect(radios.map((radio) => radio.getAttribute('data-testid'))).toEqual([
        'issue-filter-weight-none',
        'issue-filter-weight-any',
        'issue-filter-weight-all',
      ]);
      expect(
        radios.map((radio) =>
          within(group).getByRole('radio', { name: radio.textContent.slice(1) }),
        ),
      ).toEqual(radios);
      expect(within(group).getByRole('radio', { name: 'Ohne Gewicht', checked: true })).toBe(
        radios[0],
      );
      expect(within(group).getByRole('radio', { name: 'Mit Gewicht', checked: false })).toBe(
        radios[1],
      );
      expect(within(group).getByRole('radio', { name: 'Alle', checked: false })).toBe(radios[2]);
    });

    it('saves a chosen weight filter and loads the first page with it', async () => {
      const user = userEvent.setup();
      const { backend, calls } = await setup();
      await shown(3);

      await user.click(screen.getByTestId('issue-filter-weight-all'));

      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      expect(listQueries(calls)[1]).toEqual({ weight: 'ALL', period: 'ALL' });
      expect(backend.preferences.read().weightFilter).toBe('ALL');
      expect(screen.getByTestId('issue-filter-weight-all').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(screen.getByTestId('issue-filter-weight-none').getAttribute('aria-checked')).toBe(
        'false',
      );
    });

    it('loads nothing for a click on the chosen weight filter', async () => {
      const user = userEvent.setup();
      const { calls } = await setup();
      await shown(3);

      await user.click(screen.getByTestId('issue-filter-weight-none'));

      expect(listQueries(calls)).toHaveLength(1);
    });

    it('names the period filter by its visible label and marks the search field compact', async () => {
      await setup();

      const period = screen.getByRole('combobox', { name: 'Geändert in' });
      expect(period).toBe(screen.getByTestId('issue-filter-period'));
      expect(screen.getByText('Geändert in').className).not.toContain('labelHidden');
      expect(screen.getByTestId('issue-search-input').getAttribute('data-size')).toBe('compact');
    });

    it('offers the period filter as a select of the UI SDK with four options', async () => {
      const user = userEvent.setup();
      await setup();

      const trigger = screen.getByRole('combobox', { name: 'Geändert in' });
      expect(trigger).toBe(screen.getByTestId('issue-filter-period'));
      expect(trigger.getAttribute('data-slot')).toBe('select-trigger');
      expect(text('issue-filter-period')).toBe('Alle');

      await user.click(trigger);

      const options = await screen.findAllByRole('option', { hidden: true });
      expect(options.map((option) => option.getAttribute('data-testid'))).toEqual([
        'issue-filter-period-week',
        'issue-filter-period-month',
        'issue-filter-period-year',
        'issue-filter-period-all',
      ]);
      expect(options.map((option) => option.textContent)).toEqual([
        '1 Woche',
        '1 Monat',
        '1 Jahr',
        'Alle',
      ]);
    });

    it('saves a chosen period and loads the first page with it', async () => {
      const user = userEvent.setup();
      const { backend, calls } = await setup();
      await shown(3);

      await user.click(screen.getByTestId('issue-filter-period'));
      await user.click(await screen.findByTestId('issue-filter-period-month'));

      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      expect(listQueries(calls)[1]).toEqual({ weight: 'NONE', period: 'MONTH' });
      expect(backend.preferences.read().periodFilter).toBe('MONTH');
      expect(text('issue-filter-period')).toBe('1 Monat');
    });

    it('resets both filters and the search with Filter zurücksetzen', async () => {
      const user = userEvent.setup();
      savePreferences({ weightFilter: 'ANY', periodFilter: 'WEEK', name: 'Anna' });
      const { backend, calls } = await setup(lobbyScrumMaster, { issues: () => issuePage([]) });
      const input = screen.getByTestId<HTMLInputElement>('issue-search-input');
      await user.type(input, 'nothing{Enter}');
      await waitFor(() => expect(listQueries(calls)).toHaveLength(2));
      expect(listQueries(calls)[1]).toEqual({ search: 'nothing', weight: 'ANY', period: 'WEEK' });

      await user.click(await screen.findByTestId('issue-filter-reset'));

      await waitFor(() => expect(listQueries(calls)).toHaveLength(3));
      expect(listQueries(calls)[2]).toEqual({ weight: 'NONE', period: 'ALL' });
      expect(input.value).toBe('');
      expect(backend.preferences.read()).toMatchObject({
        weightFilter: 'NONE',
        periodFilter: 'ALL',
        name: 'Anna',
      });
      expect(screen.getByTestId('issue-filter-weight-none').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(text('issue-filter-period')).toBe('Alle');
    });
  });

  describe('errors', () => {
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
    ])('shows $code at the list and not in the banner', async ({ code, message }) => {
      const { backend } = await setup(lobbyScrumMaster, { issues: () => problem(502, code) });

      const alert = await screen.findByTestId('issue-results-error');
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.textContent).toContain('Die Issues konnten nicht geladen werden.');
      expect(text('issue-results-error-message')).toBe(message);
      expect(alert.textContent).not.toContain('Detail of the API.');
      expect(text('issue-results-retry')).toBe('↻ Erneut versuchen');
      expect(alert.querySelector('[aria-hidden="true"]')?.textContent).toBe('⚠');
      expect(backend.errors.error()).toBeNull();
      expect(screen.queryByTestId('issue-results-empty')).toBeNull();
      expect(screen.queryByTestId('issue-load-more')).toBeNull();
    });

    it('shows no empty state after a failed load with another code', async () => {
      const { backend } = await setup(lobbyScrumMaster, {
        issues: () => problem(409, 'INVALID_STATE'),
      });

      await waitFor(() => expect(backend.errors.error()).not.toBeNull());

      expect(screen.queryByTestId('issue-results-empty')).toBeNull();
      expect(screen.queryByTestId('issue-filter-reset')).toBeNull();
      expect(screen.queryByTestId('issue-results-error')).toBeNull();
    });

    it('shows the empty state again after a load without results', async () => {
      const user = userEvent.setup();
      const { backend } = await setup(lobbyScrumMaster, {
        issues: inSequence(
          () => problem(409, 'INVALID_STATE'),
          () => issuePage([], null, 0),
        ),
      });
      await waitFor(() => expect(backend.errors.error()).not.toBeNull());

      await user.click(screen.getByTestId('issue-search-submit'));

      expect(await screen.findByTestId('issue-results-empty')).toBeTruthy();
    });

    it('keeps the list after a failed next page with another code', async () => {
      const user = userEvent.setup();
      const { backend } = await setup(lobbyScrumMaster, {
        issues: inSequence(
          () => issuePage([LOGIN, RESET], 2, 3),
          () => problem(409, 'INVALID_STATE'),
        ),
      });
      await shown(2);

      await user.click(screen.getByTestId('issue-load-more'));
      await waitFor(() => expect(backend.errors.error()).not.toBeNull());

      expect(rows()).toHaveLength(2);
      expect(screen.queryByTestId('issue-results-empty')).toBeNull();
    });

    it('repeats the request with Erneut versuchen and removes the error after success', async () => {
      const user = userEvent.setup();
      savePreferences({ weightFilter: 'ALL', periodFilter: 'YEAR' });
      const { calls } = await setup(lobbyScrumMaster, {
        issues: inSequence(
          () => problem(502, 'GITLAB_ERROR'),
          () => issuePage(ISSUES),
        ),
      });

      await user.click(await screen.findByTestId('issue-results-retry'));
      await shown(3);

      expect(listQueries(calls)).toEqual([
        { weight: 'ALL', period: 'YEAR' },
        { weight: 'ALL', period: 'YEAR' },
      ]);
      expect(screen.queryByTestId('issue-results-error')).toBeNull();
    });

    it('keeps the list after a failed next page, hides Mehr laden and repeats that page', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(lobbyScrumMaster, {
        issues: inSequence(
          () => issuePage([LOGIN, RESET], 2, 3),
          () => problem(502, 'GITLAB_ERROR'),
          () => issuePage([ESTIMATED], null, 3),
        ),
      });
      await shown(2);

      await user.click(screen.getByTestId('issue-load-more'));
      const retry = await screen.findByTestId('issue-results-retry');

      expect(rows()).toHaveLength(2);
      expect(screen.queryByTestId('issue-load-more')).toBeNull();

      await user.click(retry);
      await shown(3);

      expect(listQueries(calls).map((query) => query['page'])).toEqual([undefined, '2', '2']);
      expect(screen.queryByTestId('issue-results-error')).toBeNull();
    });

    it('leaves another error code to the banner', async () => {
      const { backend } = await setup(lobbyScrumMaster, {
        issues: () => problem(409, 'INVALID_STATE'),
      });

      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));

      expect(screen.queryByTestId('issue-results-error')).toBeNull();
    });

    it('ignores the answer to a request that a newer one replaced', async () => {
      const user = userEvent.setup();
      const first = held();
      await setup(lobbyScrumMaster, {
        issues: inSequence(first.answer, () => issuePage([ESTIMATED], null, 1)),
      });

      await user.click(screen.getByTestId('issue-filter-weight-any'));
      await shown(1);
      await act(async () => {
        first.release(issuePage([LOGIN, RESET], 2, 2));
        await Promise.resolve();
      });

      expect(rows().map((entry) => entry.textContent.includes('#46 '))).toEqual([true]);
      expect(text('issue-count')).toBe('1 von 1 Issues');
      expect(screen.queryByTestId('issue-load-more')).toBeNull();
    });

    it('shows no error of a request that a newer one replaced', async () => {
      const user = userEvent.setup();
      const first = held();
      const { backend } = await setup(lobbyScrumMaster, {
        issues: inSequence(first.answer, () => issuePage(ISSUES)),
      });

      await user.click(screen.getByTestId('issue-filter-weight-all'));
      await shown(3);
      await act(async () => {
        first.release(problem(502, 'GITLAB_ERROR'));
        await Promise.resolve();
      });

      await waitFor(() => expect(backend.errors.error()).toBeNull());
      expect(screen.queryByTestId('issue-results-error')).toBeNull();
      expect(rows()).toHaveLength(3);
    });
  });

  describe('selection', () => {
    it('starts with the preselected issue and shows it with its link', async () => {
      await setup();
      await shown(3);

      expect(text('issue-preview')).toBe('Ausgewählt: #42 Login page');
      expect(text('issue-preview-iid')).toBe('#42');
      expect(text('issue-preview-title')).toBe('Login page');
      const link = screen.getByTestId('issue-preview-link');
      expect(link.getAttribute('href')).toBe('https://gitlab.example/group/project/-/issues/42');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('starts with the active issue before the preselected one', async () => {
      await setup(withActiveIssue({ ...discussionScrumMaster, preselectedIssueIid: 42 }, 43, 'X'));
      await shown(3);

      expect(text('issue-preview-iid')).toBe('#43');
      expect(row(43).getAttribute('aria-pressed')).toBe('true');
    });

    it('starts without a choice and without a preview', async () => {
      await setup({ ...lobbyScrumMaster, preselectedIssueIid: null });
      await shown(3);

      expect(screen.queryByTestId('issue-preview')).toBeNull();
      expect(rows().every((entry) => entry.getAttribute('aria-pressed') === 'false')).toBe(true);
      expect(release().disabled).toBe(true);
    });

    it('shows the number alone for a chosen issue that is not in the list', async () => {
      await setup({ ...lobbyScrumMaster, preselectedIssueIid: 99 });
      await shown(3);

      expect(text('issue-preview')).toBe('Ausgewählt: #99');
      expect(screen.queryByTestId('issue-preview-link')).toBeNull();
      expect(screen.queryByTestId('issue-preview-title')).toBeNull();
    });

    it('shows no link for an address that is not http or https', async () => {
      await setup(lobbyScrumMaster, {
        issues: () => issuePage([{ ...LOGIN, webUrl: 'javascript:alert(1)' }]),
      });
      await shown(1);

      expect(text('issue-preview-iid')).toBe('#42');
      expect(screen.queryByTestId('issue-preview-link')).toBeNull();
    });

    it('follows a click and then the active issue of a later snapshot', async () => {
      const user = userEvent.setup();
      const test = await setup();
      await shown(3);

      await user.click(row(43));
      expect(text('issue-preview')).toBe('Ausgewählt: #43 Password reset');

      receiveSnapshot(test, withActiveIssue(discussionScrumMaster, 46, 'Estimated issue'));

      expect(text('issue-preview-iid')).toBe('#46');
      expect(row(46).getAttribute('aria-pressed')).toBe('true');
      expect(row(43).getAttribute('aria-pressed')).toBe('false');
    });

    it('keeps a click when a later snapshot has the same active issue', async () => {
      const user = userEvent.setup();
      const test = await setup(discussionScrumMaster);
      await shown(3);

      await user.click(row(43));
      receiveSnapshot(test, votingScrumMaster);

      expect(text('issue-preview-iid')).toBe('#43');
    });
  });

  describe('release', () => {
    it.each([
      { name: 'LOBBY', snapshot: lobbyScrumMaster, label: 'Freigeben' },
      { name: 'DISCUSSION', snapshot: discussionScrumMaster, label: 'Issue wechseln' },
      { name: 'VOTING', snapshot: votingScrumMaster, label: 'Issue wechseln' },
      { name: 'REVEALED', snapshot: revealedScrumMaster, label: 'Issue wechseln' },
    ])('names the button „$label“ in $name', async ({ snapshot, label }) => {
      await setup(snapshot);

      expect(text('issue-release')).toBe(label);
    });

    it('is enabled in LOBBY with a preselected issue', async () => {
      await setup();

      expect(release().disabled).toBe(false);
    });

    it('is disabled while the chosen issue is the active one', async () => {
      const user = userEvent.setup();
      await setup(discussionScrumMaster);
      await shown(3);
      expect(release().disabled).toBe(true);

      await user.click(row(43));
      expect(release().disabled).toBe(false);

      await user.click(row(42));
      expect(release().disabled).toBe(true);
    });

    it('is disabled while the round is confirmed', async () => {
      const user = userEvent.setup();
      const test = await setup(revealedScrumMaster);
      await shown(3);
      await user.click(row(43));
      expect(release().disabled).toBe(false);

      receiveSnapshot(test, confirming(revealedScrumMaster));

      expect(release().disabled).toBe(true);
    });

    it('releases the chosen issue in LOBBY and stays disabled until the answer', async () => {
      const user = userEvent.setup();
      const command = held();
      const { calls } = await setup(lobbyScrumMaster, { command: command.answer });
      await shown(3);

      await user.click(release());

      expect(commands(calls).map((call) => [call.method, call.url, call.body])).toEqual([
        ['POST', `/api/sessions/${ID}/active-issue`, { issueIid: 42 }],
      ]);
      expect(release().disabled).toBe(true);
      expect(screen.queryByTestId('switch-dialog')).toBeNull();

      await user.click(release());
      expect(commands(calls)).toHaveLength(1);

      act(() => command.release(new Response(null, { status: 204 })));

      await waitFor(() => expect(release().disabled).toBe(false));
    });

    it('is enabled again after a failed release', async () => {
      const user = userEvent.setup();
      const { backend } = await setup(lobbyScrumMaster, {
        command: () => problem(409, 'INVALID_STATE'),
      });
      await shown(3);

      await user.click(release());

      await waitFor(() => expect(backend.errors.error()?.errorCode).toBe('INVALID_STATE'));
      await waitFor(() => expect(release().disabled).toBe(false));
    });

    it('switches the issue in DISCUSSION without a question', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(discussionScrumMaster);
      await shown(3);

      await user.click(row(43));
      await user.click(release());

      expect(screen.queryByTestId('switch-dialog')).toBeNull();
      expect(commands(calls).map((call) => call.body)).toEqual([{ issueIid: 43 }]);
    });

    it('asks in VOTING and sends nothing after Abbrechen', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(votingScrumMaster);
      await shown(3);
      await user.click(row(43));

      await user.click(release());

      expect(text('switch-text')).toBe(
        'Runde 1 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 1 abgegebene Schätzung wird verworfen.',
      );
      expect(commands(calls)).toHaveLength(0);

      await user.click(screen.getByTestId('switch-cancel'));

      await waitFor(() => expect(screen.queryByTestId('switch-dialog')).toBeNull());
      expect(commands(calls)).toHaveLength(0);
      expect(text('issue-preview-iid')).toBe('#43');
      expect(release().disabled).toBe(false);
    });

    it('sends nothing after Escape and returns the focus to the button', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(votingScrumMaster);
      await shown(3);
      await user.click(row(43));
      await user.click(release());
      await screen.findByTestId('switch-dialog');

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByTestId('switch-dialog')).toBeNull());
      expect(commands(calls)).toHaveLength(0);
      await waitFor(() => expect(document.activeElement).toBe(release()));
    });

    it('switches the issue after the confirmation', async () => {
      const user = userEvent.setup();
      const { calls } = await setup(votingScrumMaster);
      await shown(3);
      await user.click(row(43));
      await user.click(release());

      await user.click(await screen.findByTestId('switch-confirm'));

      await waitFor(() => expect(screen.queryByTestId('switch-dialog')).toBeNull());
      expect(commands(calls).map((call) => [call.method, call.url, call.body])).toEqual([
        ['POST', `/api/sessions/${ID}/active-issue`, { issueIid: 43 }],
      ]);
    });

    it('names the revealed round in REVEALED', async () => {
      const user = userEvent.setup();
      await setup(revealedScrumMaster);
      await shown(3);
      await user.click(row(46));

      await user.click(release());

      expect(text('switch-text')).toBe(
        'Runde 1 zu #42 ist aufgedeckt und hat keinen Endwert. Beim Wechsel bleibt sie ohne Endwert im Protokoll.',
      );
    });

    it('sends nothing when the button is disabled at the time of the confirmation', async () => {
      const user = userEvent.setup();
      const test = await setup(revealedScrumMaster);
      await shown(3);
      await user.click(row(43));
      await user.click(release());
      await screen.findByTestId('switch-dialog');

      receiveSnapshot(test, confirming(revealedScrumMaster));
      await user.click(screen.getByTestId('switch-confirm'));

      await waitFor(() => expect(screen.queryByTestId('switch-dialog')).toBeNull());
      expect(commands(test.calls)).toHaveLength(0);
    });
  });

  describe('reload', () => {
    it('loads the first page again after REVEALED to LOBBY', async () => {
      const user = userEvent.setup();
      const test = await setup(revealedScrumMaster);
      await shown(3);
      await user.click(screen.getByTestId('issue-filter-weight-all'));
      await waitFor(() => expect(listQueries(test.calls)).toHaveLength(2));

      receiveSnapshot(test, lobbyScrumMaster);

      await waitFor(() => expect(listQueries(test.calls)).toHaveLength(3));
      expect(listQueries(test.calls)[2]).toEqual({ weight: 'ALL', period: 'ALL' });
    });

    it.each([
      { name: 'DISCUSSION to LOBBY', from: discussionScrumMaster, to: lobbyScrumMaster },
      { name: 'VOTING to REVEALED', from: votingScrumMaster, to: revealedScrumMaster },
      { name: 'REVEALED to VOTING', from: revealedScrumMaster, to: votingScrumMaster },
    ])('loads nothing after $name', async ({ from, to }) => {
      const test = await setup(from);
      await shown(3);

      receiveSnapshot(test, to);
      await act(async () => {
        await Promise.resolve();
      });

      expect(listQueries(test.calls)).toHaveLength(1);
    });
  });
});
