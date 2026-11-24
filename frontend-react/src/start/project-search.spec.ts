import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ErrorCode } from '../api/api-error';
import { createTestBackend, problem } from '../api/testing/test-backend';
import type { Answer, FetchCall } from '../api/testing/test-backend';
import { SEARCH_DELAY_MS, createIssueSearch, createProjectSearch } from './project-search';
import type { IssueSummary, ProjectSummary, SearchTimers } from './project-search';

const PROJECT: ProjectSummary = {
  id: 1234,
  name: 'Planning Poker Test',
  pathWithNamespace: 'group/project',
  webUrl: 'https://gitlab.example/group/project',
};
const OTHER_PROJECT: ProjectSummary = {
  id: 77,
  name: 'Webshop',
  pathWithNamespace: 'group/webshop',
  webUrl: 'https://gitlab.example/group/webshop',
};
const ISSUE: IssueSummary = {
  iid: 43,
  title: 'Password reset',
  webUrl: 'https://gitlab.example/group/project/-/issues/43',
  weight: null,
};
const IDLE = { items: [], searched: false, error: null };
const TIMERS: SearchTimers = {
  setTimeout: (handler, delayMs) => setTimeout(handler, delayMs),
  clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};
const SEARCH_ERROR_TEXTS: { code: ErrorCode; status: number; text: string }[] = [
  {
    code: 'PROJECT_NOT_ALLOWED',
    status: 403,
    text: 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
  },
  {
    code: 'GITLAB_ACCESS_DENIED',
    status: 502,
    text: 'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  },
  {
    code: 'GITLAB_ERROR',
    status: 502,
    text: 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
  },
];

function projects(...items: ProjectSummary[]): Response {
  return Response.json({ items, nextPage: null });
}

function issues(...items: IssueSummary[]): Response {
  return Response.json({ items, nextPage: null, total: items.length });
}

function urls(calls: FetchCall[]): string[] {
  return calls.map((call) => `${call.method} ${call.url}`);
}

function projectSearch(answer: Answer, initialText = '') {
  const test = createTestBackend(answer);
  const search = createProjectSearch(test.backend.api, test.backend.errors, TIMERS, initialText);
  return { ...test, search };
}

function issueSearch(answer: Answer) {
  const test = createTestBackend(answer);
  const search = createIssueSearch(test.backend.api, test.backend.errors, TIMERS);
  return { ...test, search };
}

async function afterDelay(): Promise<void> {
  await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS);
}

describe('project search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches 300 ms after the last input and shows the projects', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT));

    search.text('P');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);
    search.text('Pl');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);

    expect(calls).toEqual([]);
    expect(search.result()).toEqual(IDLE);

    await vi.advanceTimersByTimeAsync(1);

    expect(urls(calls)).toEqual(['GET /api/projects?search=Pl']);
    expect(search.result()).toEqual({ items: [PROJECT], searched: true, error: null });
  });

  it('sends the text without white space at the ends and not again for the same text', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT));

    search.text(' Poker ');
    await afterDelay();
    search.text('Poker');
    await afterDelay();

    expect(urls(calls)).toEqual(['GET /api/projects?search=Poker']);
  });

  it.each([
    { name: 'digits only', text: '1234' },
    { name: 'digits with white space', text: ' 1234 ' },
    { name: 'an empty text', text: '' },
    { name: 'white space only', text: '   ' },
  ])('takes $name as input without a search', async ({ text }) => {
    const { search, calls } = projectSearch(() => projects(PROJECT), 'Planning');

    search.text(text);
    await afterDelay();

    expect(calls).toEqual([]);
    expect(search.result()).toEqual(IDLE);
  });

  it('searches a text with one character that is no digit', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT));

    search.text('12a');
    await afterDelay();

    expect(urls(calls)).toEqual(['GET /api/projects?search=12a']);
  });

  it('loads the first page without search at once with the focus on the empty field', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT, OTHER_PROJECT));

    search.focus(' ');

    expect(urls(calls)).toEqual(['GET /api/projects']);
    await vi.advanceTimersByTimeAsync(0);
    expect(search.result()).toEqual({
      items: [PROJECT, OTHER_PROJECT],
      searched: true,
      error: null,
    });
  });

  it('loads nothing with the focus on a filled field', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT), '1234');

    search.focus('1234');
    await afterDelay();

    expect(calls).toEqual([]);
  });

  it('marks an empty answer as searched', async () => {
    const { search } = projectSearch(() => projects());

    search.text('kein Treffer');
    await afterDelay();

    expect(search.result()).toEqual({ items: [], searched: true, error: null });
  });

  it('shows only the answer to the last input', async () => {
    let releaseFirst: (response: Response) => void = () => undefined;
    const { search } = projectSearch((call) =>
      call.url.endsWith('search=Plan')
        ? new Promise<Response>((resolve) => (releaseFirst = resolve))
        : projects(OTHER_PROJECT),
    );

    search.text('Plan');
    await afterDelay();
    search.text('Web');
    releaseFirst(projects(PROJECT));
    await vi.advanceTimersByTimeAsync(0);

    expect(search.result()).toEqual(IDLE);

    await afterDelay();

    expect(search.result()).toEqual({ items: [OTHER_PROJECT], searched: true, error: null });
  });

  it('empties the list at once for an input without a search and drops the open answer', async () => {
    let release: (response: Response) => void = () => undefined;
    const { search } = projectSearch((call) =>
      call.url.endsWith('search=Plan')
        ? new Promise<Response>((resolve) => (release = resolve))
        : projects(PROJECT),
    );
    search.focus('');
    await vi.advanceTimersByTimeAsync(0);
    expect(search.result().items).toEqual([PROJECT]);

    search.text('Plan');
    await afterDelay();
    search.text('1234');

    expect(search.result()).toEqual(IDLE);

    release(projects(OTHER_PROJECT));
    await afterDelay();

    expect(search.result()).toEqual(IDLE);
  });

  it('tells its listeners about a new result until they leave', async () => {
    const { search } = projectSearch(() => projects(PROJECT));
    const listener = vi.fn();
    const leave = search.subscribe(listener);

    search.focus('');
    await vi.advanceTimersByTimeAsync(0);

    expect(listener).toHaveBeenCalledTimes(1);

    leave();
    search.text('1234');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('sends nothing after stop', async () => {
    const { search, calls } = projectSearch(() => projects(PROJECT));

    search.text('Plan');
    search.stop();
    await afterDelay();

    expect(calls).toEqual([]);
  });

  it.each(SEARCH_ERROR_TEXTS)(
    'shows the text of $code at the search and clears the error state',
    async ({ code, status, text }) => {
      const { search, backend } = projectSearch(() => problem(status, code));

      search.text('Plan');
      await afterDelay();

      expect(search.result()).toEqual({ items: [], searched: true, error: text });
      expect(backend.errors.error()).toBeNull();
    },
  );

  it('empties the list without a text for another error code and keeps the error state', async () => {
    let failing = false;
    const { search, backend } = projectSearch(() =>
      failing ? problem(429, 'LIMIT_REACHED') : projects(PROJECT),
    );
    search.text('Plan');
    await afterDelay();
    failing = true;

    search.text('Web');
    await afterDelay();

    expect(search.result()).toEqual(IDLE);
    expect(backend.errors.error()?.errorCode).toBe('LIMIT_REACHED');
  });

  it('empties the list without a text when the call fails', async () => {
    const { search, backend } = projectSearch(() => Promise.reject(new TypeError('Failed')));

    search.text('Plan');
    await afterDelay();

    expect(search.result()).toEqual(IDLE);
    expect(backend.errors.error()).toBeNull();
  });
});

describe('issue search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { project: '1234', text: '', url: 'GET /api/projects/1234/issues' },
    { project: ' 1234 ', text: ' Pass ', url: 'GET /api/projects/1234/issues?search=Pass' },
    { project: '1234', text: '4a', url: 'GET /api/projects/1234/issues?search=4a' },
  ])('searches the issues of project "$project" for "$text"', async ({ project, text, url }) => {
    const { search, calls } = issueSearch(() => issues(ISSUE));

    search.input(project, text);
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS - 1);

    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);

    expect(urls(calls)).toEqual([url]);
    expect(search.result()).toEqual({ items: [ISSUE], searched: true, error: null });
  });

  it.each([
    { name: 'the issue text is a number', project: '1234', text: '42' },
    { name: 'the project is a path', project: 'group/project', text: 'Pass' },
    { name: 'the project is empty', project: '', text: 'Pass' },
  ])('does not search when $name', async ({ project, text }) => {
    const { search, calls } = issueSearch(() => issues(ISSUE));

    search.input(project, text);
    await afterDelay();

    expect(calls).toEqual([]);
    expect(search.result()).toEqual(IDLE);
  });

  it('empties the list at once when the issue text becomes a number', async () => {
    const { search } = issueSearch(() => issues(ISSUE));
    search.input('1234', '');
    await afterDelay();
    expect(search.result().items).toEqual([ISSUE]);

    search.input('1234', '42');

    expect(search.result()).toEqual(IDLE);
  });

  it('searches again for the same input after stop', async () => {
    const { search, calls } = issueSearch(() => issues(ISSUE));
    search.input('1234', '');
    search.stop();

    search.input('1234', '');
    await afterDelay();

    expect(urls(calls)).toEqual(['GET /api/projects/1234/issues']);
  });

  it('marks an empty answer as searched', async () => {
    const { search } = issueSearch(() => issues());

    search.input('1234', 'kein Treffer');
    await afterDelay();

    expect(search.result()).toEqual({ items: [], searched: true, error: null });
  });

  it.each(SEARCH_ERROR_TEXTS)(
    'shows the text of $code at the search and clears the error state',
    async ({ code, status, text }) => {
      const { search, backend } = issueSearch(() => problem(status, code));

      search.input('1234', 'Pass');
      await afterDelay();

      expect(search.result()).toEqual({ items: [], searched: true, error: text });
      expect(backend.errors.error()).toBeNull();
    },
  );

  it('empties the list without a text for another error code and keeps the error state', async () => {
    const { search, backend } = issueSearch(() => problem(404, 'PROJECT_NOT_FOUND'));

    search.input('1234', 'Pass');
    await afterDelay();

    expect(search.result()).toEqual(IDLE);
    expect(backend.errors.error()?.errorCode).toBe('PROJECT_NOT_FOUND');
  });
});
