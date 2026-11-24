import { beforeEach, describe, expect, it } from 'vitest';
import type { Api } from './api';
import { ApiError } from './api-error';
import { lobbyScrumMaster } from './examples';
import { createTestBackend, problem } from './testing/test-backend';
import type { Answer } from './testing/test-backend';

const ID = 'K7P2QX9M';
const SESSION = `/api/sessions/${ID}`;
const IDENTITY = { participantId: 'p-1', token: 'token-of-anna' };

interface Case {
  name: string;
  call: (api: Api) => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
}

const CALLS: Case[] = [
  { name: 'config', call: (api) => api.config(), method: 'GET', url: '/api/config' },
  {
    name: 'createSession',
    call: (api) => api.createSession({ name: 'Anna', gitlabProjectId: '1234', issueIid: 42 }),
    method: 'POST',
    url: '/api/sessions',
    body: { name: 'Anna', gitlabProjectId: '1234', issueIid: 42 },
  },
  {
    name: 'joinSession',
    call: (api) => api.joinSession(ID, { name: 'Ben', invite: 'code' }),
    method: 'POST',
    url: `${SESSION}/participants`,
    body: { name: 'Ben', invite: 'code' },
  },
  { name: 'getSession', call: (api) => api.getSession(ID), method: 'GET', url: SESSION },
  {
    name: 'listIssues without a query',
    call: (api) => api.listIssues(ID),
    method: 'GET',
    url: `${SESSION}/issues`,
  },
  {
    name: 'listIssues with every query value',
    call: (api) =>
      api.listIssues(ID, { search: 'log in', page: 2, weight: 'ANY', period: 'MONTH' }),
    method: 'GET',
    url: `${SESSION}/issues?search=log+in&page=2&weight=ANY&period=MONTH`,
  },
  {
    name: 'listIssues with a weight alone',
    call: (api) => api.listIssues(ID, { weight: 'ALL' }),
    method: 'GET',
    url: `${SESSION}/issues?weight=ALL`,
  },
  {
    name: 'searchProjects without a query',
    call: (api) => api.searchProjects(),
    method: 'GET',
    url: '/api/projects',
  },
  {
    name: 'searchProjects with a search text',
    call: (api) => api.searchProjects({ search: 'poker', page: 1 }),
    method: 'GET',
    url: '/api/projects?search=poker&page=1',
  },
  {
    name: 'searchProjectIssues',
    call: (api) => api.searchProjectIssues('group/project', { search: 'export' }),
    method: 'GET',
    url: '/api/projects/group%2Fproject/issues?search=export',
  },
  {
    name: 'selectIssue',
    call: (api) => api.selectIssue(ID, { issueIid: 43 }),
    method: 'POST',
    url: `${SESSION}/active-issue`,
    body: { issueIid: 43 },
  },
  {
    name: 'setTimer',
    call: (api) => api.setTimer(ID, { seconds: 30 }),
    method: 'PUT',
    url: `${SESSION}/timer`,
    body: { seconds: 30 },
  },
  {
    name: 'vote',
    call: (api) => api.vote(ID, { card: '5' }),
    method: 'PUT',
    url: `${SESSION}/vote`,
    body: { card: '5' },
  },
  {
    name: 'startVoting',
    call: (api) => api.startVoting(ID),
    method: 'POST',
    url: `${SESSION}/round/start`,
  },
  {
    name: 'revealRound',
    call: (api) => api.revealRound(ID),
    method: 'POST',
    url: `${SESSION}/round/reveal`,
  },
  {
    name: 'restartRound',
    call: (api) => api.restartRound(ID),
    method: 'POST',
    url: `${SESSION}/round/restart`,
  },
  {
    name: 'confirmRound',
    call: (api) => api.confirmRound(ID, { card: '8' }),
    method: 'POST',
    url: `${SESSION}/round/confirm`,
    body: { card: '8' },
  },
];

const noContent: Answer = () => new Response(null, { status: 204 });

describe('Api', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it.each(CALLS)('sends $name as $method $url', async ({ call, method, url, body }) => {
    const { backend, calls } = createTestBackend(noContent);

    await call(backend.api);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(url);
    expect(calls[0]?.body).toEqual(body);
    expect(calls[0]?.headers['Content-Type']).toBe(
      body === undefined ? undefined : 'application/json',
    );
  });

  it('returns the body of an answer 200 and undefined for an answer 204', async () => {
    const withBody = createTestBackend(() => Response.json(lobbyScrumMaster));
    const withoutBody = createTestBackend(noContent);

    expect(await withBody.backend.api.getSession(ID)).toEqual(lobbyScrumMaster);
    expect(await withoutBody.backend.api.vote(ID, { card: '5' })).toBeUndefined();
  });

  describe('header Authorization', () => {
    const authenticated = CALLS.filter(
      ({ url, name }) => url.startsWith(SESSION) && name !== 'joinSession',
    );
    const open = CALLS.filter(
      ({ url, name }) => !url.startsWith(SESSION) || name === 'joinSession',
    );

    it('covers every call of the table', () => {
      expect(authenticated).toHaveLength(11);
      expect(open).toHaveLength(6);
    });

    it.each(authenticated)('sends the token of the session with $name', async ({ call }) => {
      const { backend, calls } = createTestBackend(noContent);
      backend.tokens.store(ID, IDENTITY);

      await call(backend.api);

      expect(calls[0]?.headers['Authorization']).toBe('Bearer token-of-anna');
    });

    it.each(open)('sends no header with $name', async ({ call }) => {
      const { backend, calls } = createTestBackend(noContent);
      backend.tokens.store(ID, IDENTITY);

      await call(backend.api);

      expect(calls[0]?.headers).not.toHaveProperty('Authorization');
    });

    it('sends no header for a session without a stored token', async () => {
      const { backend, calls } = createTestBackend(noContent);
      backend.tokens.store('ABCDEFGH', IDENTITY);

      await backend.api.getSession(ID);

      expect(calls[0]?.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('errors', () => {
    it('throws an ApiError for a problem with an errorCode and reports it', async () => {
      const { backend } = createTestBackend(() => problem(409, 'NAME_TAKEN', 'Name is taken.'));

      const error: unknown = await backend.api
        .joinSession(ID, { name: 'Ben', invite: 'code' })
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        errorCode: 'NAME_TAKEN',
        status: 409,
        detail: 'Name is taken.',
      });
      expect(backend.errors.error()).toBe(error);
    });

    it('throws the ApiError and reports nothing when the caller switches the report off', async () => {
      const { backend } = createTestBackend(() => problem(500, 'GITLAB_ERROR'));

      const error: unknown = await backend.api
        .config({ reportError: false })
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(ApiError);
      expect(backend.errors.error()).toBeNull();
    });

    it.each<{ name: string; answer: Answer }>([
      {
        name: 'an answer 500 with a JSON body without errorCode',
        answer: () => Response.json({ message: 'failed' }, { status: 500 }),
      },
      {
        name: 'an answer 502 with a text body',
        answer: () => new Response('Bad Gateway', { status: 502 }),
      },
      {
        name: 'a network failure',
        answer: () => Promise.reject(new TypeError('Failed to fetch')),
      },
    ])('throws an error that is no ApiError for $name and reports nothing', async ({ answer }) => {
      const { backend } = createTestBackend(answer);

      const error: unknown = await backend.api.getSession(ID).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ApiError);
      expect(backend.errors.error()).toBeNull();
    });
  });
});
