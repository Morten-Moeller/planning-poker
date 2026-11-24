import { ApiError, isProblemDetail } from './api-error';
import type { ErrorState } from './error-state';
import type { UpdatedPeriod, WeightFilter } from './preferences-store';
import type { ConfigResponse } from './recent-sessions';
import type { components } from './schema';
import type { TokenStore } from './token-store';

type Schemas = components['schemas'];
export type CreateSessionRequest = Schemas['CreateSessionRequest'];
export type CreateSessionResponse = Schemas['CreateSessionResponse'];
export type JoinSessionRequest = Schemas['JoinSessionRequest'];
export type JoinSessionResponse = Schemas['JoinSessionResponse'];
export type SessionView = Schemas['SessionView'];
export type IssueListResponse = Schemas['IssueListResponse'];
export type SelectIssueRequest = Schemas['SelectIssueRequest'];
export type VoteRequest = Schemas['VoteRequest'];
export type TimerRequest = Schemas['TimerRequest'];
export type ConfirmRequest = Schemas['ConfirmRequest'];
export type ProjectListResponse = Schemas['ProjectListResponse'];

export interface IssueQuery {
  search?: string;
  page?: number;
}

export interface IssueFilterQuery extends IssueQuery {
  weight?: WeightFilter;
  period?: UpdatedPeriod;
}

export interface ConfigCall {
  signal?: AbortSignal;
  reportError?: boolean;
}

export interface Api {
  config(call?: ConfigCall): Promise<ConfigResponse>;
  createSession(request: CreateSessionRequest): Promise<CreateSessionResponse>;
  joinSession(sessionId: string, request: JoinSessionRequest): Promise<JoinSessionResponse>;
  getSession(sessionId: string): Promise<SessionView>;
  listIssues(sessionId: string, query?: IssueFilterQuery): Promise<IssueListResponse>;
  searchProjects(query?: IssueQuery): Promise<ProjectListResponse>;
  searchProjectIssues(projectId: string, query?: IssueQuery): Promise<IssueListResponse>;
  selectIssue(sessionId: string, request: SelectIssueRequest): Promise<void>;
  setTimer(sessionId: string, request: TimerRequest): Promise<void>;
  vote(sessionId: string, request: VoteRequest): Promise<void>;
  startVoting(sessionId: string): Promise<void>;
  revealRound(sessionId: string): Promise<void>;
  restartRound(sessionId: string): Promise<void>;
  confirmRound(sessionId: string, request: ConfirmRequest): Promise<void>;
}

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

interface Call {
  query?: IssueFilterQuery;
  body?: unknown;
  signal?: AbortSignal;
  reportError?: boolean;
}

const SESSION_PATH = /^\/api\/sessions\/([^/?]+)(\/[^?]*)?/;
const QUERY_KEYS = ['search', 'page', 'weight', 'period'] as const;
const NO_CONTENT = 204;

export function sessionIdOfAuthenticatedCall(method: string, path: string): string | null {
  const match = SESSION_PATH.exec(path);
  if (match === null || match[1] === undefined) {
    return null;
  }
  const isJoin = method === 'POST' && match[2] === '/participants';
  return isJoin ? null : decodeURIComponent(match[1]);
}

function sessionPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}`;
}

function withQuery(path: string, query: IssueFilterQuery): string {
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = query[key];
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text === '' ? path : `${path}?${text}`;
}

async function bodyOf(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createApi(fetchCall: Fetch, tokens: TokenStore, errors: ErrorState): Api {
  async function request<T>(method: string, path: string, call: Call = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const sessionId = sessionIdOfAuthenticatedCall(method, path);
    const identity = sessionId === null ? null : tokens.identity(sessionId);
    if (identity !== null) {
      headers['Authorization'] = `Bearer ${identity.token}`;
    }
    const init: RequestInit = { method, headers };
    if (call.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(call.body);
    }
    if (call.signal !== undefined) {
      init.signal = call.signal;
    }
    const response = await fetchCall(withQuery(path, call.query ?? {}), init);
    if (response.ok) {
      return (response.status === NO_CONTENT ? undefined : await response.json()) as T;
    }
    const problem = await bodyOf(response);
    if (!isProblemDetail(problem)) {
      throw new Error(`${method} ${path} answered ${response.status}`);
    }
    const error = new ApiError(problem.errorCode, response.status, problem.detail);
    if (call.reportError !== false) {
      errors.report(error);
    }
    throw error;
  }

  return {
    config: (call = {}) => request('GET', '/api/config', call),
    createSession: (body) => request('POST', '/api/sessions', { body }),
    joinSession: (sessionId, body) =>
      request('POST', `${sessionPath(sessionId)}/participants`, { body }),
    getSession: (sessionId) => request('GET', sessionPath(sessionId)),
    listIssues: (sessionId, query = {}) =>
      request('GET', `${sessionPath(sessionId)}/issues`, { query }),
    searchProjects: (query = {}) => request('GET', '/api/projects', { query }),
    searchProjectIssues: (projectId, query = {}) =>
      request('GET', `/api/projects/${encodeURIComponent(projectId)}/issues`, { query }),
    selectIssue: (sessionId, body) =>
      request('POST', `${sessionPath(sessionId)}/active-issue`, { body }),
    setTimer: (sessionId, body) => request('PUT', `${sessionPath(sessionId)}/timer`, { body }),
    vote: (sessionId, body) => request('PUT', `${sessionPath(sessionId)}/vote`, { body }),
    startVoting: (sessionId) => request('POST', `${sessionPath(sessionId)}/round/start`),
    revealRound: (sessionId) => request('POST', `${sessionPath(sessionId)}/round/reveal`),
    restartRound: (sessionId) => request('POST', `${sessionPath(sessionId)}/round/restart`),
    confirmRound: (sessionId, body) =>
      request('POST', `${sessionPath(sessionId)}/round/confirm`, { body }),
  };
}
