import type { Api } from '../api/api';
import type { ErrorCode } from '../api/api-error';
import { formErrorMessage } from '../api/error-messages';
import type { ErrorState } from '../api/error-state';
import type { components } from '../api/schema';

export type ProjectSummary = components['schemas']['ProjectSummary'];
export type IssueSummary = components['schemas']['IssueSummary'];

export interface SearchResult<T> {
  readonly items: readonly T[];
  readonly searched: boolean;
  readonly error: string | null;
}

export interface SearchTimers {
  setTimeout(handler: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
}

export interface SearchState<T> {
  result(): SearchResult<T>;
  subscribe(listener: () => void): () => void;
  stop(): void;
}

export interface ProjectSearch extends SearchState<ProjectSummary> {
  text(value: string): void;
  focus(value: string): void;
}

export interface IssueSearch extends SearchState<IssueSummary> {
  input(projectId: string, text: string): void;
}

interface SearchQuery {
  projectId: string;
  text: string;
  all: boolean;
}

interface SearchRun<T> extends SearchState<T> {
  run(query: SearchQuery): void;
}

export const SEARCH_DELAY_MS = 300;
const WHOLE_NUMBER = /^\d+$/;
const SEARCH_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'PROJECT_NOT_ALLOWED',
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
]);
const IDLE: SearchResult<never> = { items: [], searched: false, error: null };

function createSearch<T>(
  searchable: (query: SearchQuery) => boolean,
  request: (query: SearchQuery) => Promise<{ items: T[] }>,
  errors: ErrorState,
  timers: SearchTimers,
): SearchRun<T> {
  const listeners = new Set<() => void>();
  let current: SearchResult<T> = IDLE;
  let latest: SearchQuery | null = null;
  let timer: unknown = null;

  const set = (next: SearchResult<T>) => {
    if (next === current) {
      return;
    }
    current = next;
    listeners.forEach((listener) => listener());
  };

  const failure = (error: unknown): SearchResult<T> => {
    const message = formErrorMessage(error, SEARCH_ERRORS);
    if (message === null) {
      return IDLE;
    }
    errors.clear();
    return { items: [], searched: true, error: message };
  };

  const load = (query: SearchQuery) => {
    void request(query)
      .then(
        (page): SearchResult<T> => ({ items: page.items, searched: true, error: null }),
        failure,
      )
      .then((next) => {
        if (latest === query) {
          set(next);
        }
      });
  };

  const cancelTimer = () => {
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
  };

  return {
    result: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run(query) {
      latest = query;
      cancelTimer();
      if (!searchable(query)) {
        set(IDLE);
        return;
      }
      if (query.all) {
        load(query);
        return;
      }
      timer = timers.setTimeout(() => {
        timer = null;
        load(query);
      }, SEARCH_DELAY_MS);
    },
    stop() {
      latest = null;
      cancelTimer();
    },
  };
}

export function createProjectSearch(
  api: Api,
  errors: ErrorState,
  timers: SearchTimers,
  initialText: string,
): ProjectSearch {
  const search = createSearch<ProjectSummary>(
    (query) => query.all || (query.text !== '' && !WHOLE_NUMBER.test(query.text)),
    (query) => api.searchProjects(query.text === '' ? {} : { search: query.text }),
    errors,
    timers,
  );
  let last = initialText.trim();

  return {
    result: search.result,
    subscribe: search.subscribe,
    stop: search.stop,
    text(value) {
      const text = value.trim();
      if (text === last) {
        return;
      }
      last = text;
      search.run({ projectId: '', text, all: false });
    },
    focus(value) {
      if (value.trim() === '') {
        search.run({ projectId: '', text: '', all: true });
      }
    },
  };
}

export function createIssueSearch(api: Api, errors: ErrorState, timers: SearchTimers): IssueSearch {
  const search = createSearch<IssueSummary>(
    (query) => WHOLE_NUMBER.test(query.projectId) && !WHOLE_NUMBER.test(query.text),
    (query) =>
      api.searchProjectIssues(query.projectId, query.text === '' ? {} : { search: query.text }),
    errors,
    timers,
  );
  let last: string | null = null;

  return {
    result: search.result,
    subscribe: search.subscribe,
    stop() {
      last = null;
      search.stop();
    },
    input(projectValue, textValue) {
      const projectId = projectValue.trim();
      const text = textValue.trim();
      const key = JSON.stringify([projectId, text]);
      if (key === last) {
        return;
      }
      last = key;
      search.run({ projectId, text, all: false });
    },
  };
}
