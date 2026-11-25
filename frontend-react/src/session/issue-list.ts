import type { Api, IssueFilterQuery, IssueListResponse } from '../api/api';
import type { ErrorCode } from '../api/api-error';
import { formErrorMessage } from '../api/error-messages';
import type { ErrorState } from '../api/error-state';

export type IssueSummary = IssueListResponse['items'][number];

export interface IssueListState {
  readonly items: readonly IssueSummary[];
  readonly nextPage: number | null;
  readonly total: number | null;
  readonly loading: boolean;
  readonly failure: string | null;
}

export interface IssueList {
  state(): IssueListState;
  subscribe(listener: () => void): () => void;
  load(query: IssueFilterQuery): void;
  loadMore(): void;
  retry(): void;
  stop(): void;
}

interface Load {
  query: IssueFilterQuery;
  append: boolean;
}

const SEARCH_ERRORS: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'GITLAB_ACCESS_DENIED',
  'GITLAB_ERROR',
]);

const EMPTY: IssueListState = {
  items: [],
  nextPage: null,
  total: null,
  loading: false,
  failure: null,
};

export function createIssueList(api: Api, errors: ErrorState, sessionId: string): IssueList {
  const listeners = new Set<() => void>();
  let current: IssueListState = EMPTY;
  let filters: IssueFilterQuery = {};
  let latest: Load | null = null;

  const set = (next: IssueListState) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  const run = (load: Load) => {
    latest = load;
    set({ ...current, loading: true, failure: null });
    api.listIssues(sessionId, load.query).then(
      (page) => {
        if (latest !== load) {
          return;
        }
        set({
          items: load.append ? [...current.items, ...page.items] : page.items,
          nextPage: page.nextPage,
          total: page.total,
          loading: false,
          failure: null,
        });
      },
      (error: unknown) => {
        const message = formErrorMessage(error, SEARCH_ERRORS);
        if (message !== null) {
          errors.clear();
        }
        if (latest !== load) {
          return;
        }
        set({ ...current, loading: false, failure: message });
      },
    );
  };

  return {
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(query) {
      filters = query;
      run({ query, append: false });
    },
    loadMore() {
      if (current.nextPage !== null) {
        run({ query: { ...filters, page: current.nextPage }, append: true });
      }
    },
    retry() {
      if (latest !== null) {
        run({ query: latest.query, append: latest.append });
      }
    },
    stop() {
      latest = null;
    },
  };
}
