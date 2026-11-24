import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import type { Fetch } from '../api';
import { BackendProvider, createBackend } from '../backend';
import type { Backend } from '../backend';
import { createFakeSocketFactory } from './fake-web-socket';
import type { FakeSocketFactory } from './fake-web-socket';

export interface FetchCall {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal | null;
}

export type Answer = (call: FetchCall) => Response | Promise<Response>;

export interface FakeFetch {
  readonly calls: FetchCall[];
  readonly fetch: Fetch;
}

export interface TestBackend {
  backend: Backend;
  calls: FetchCall[];
  sockets: FakeSocketFactory;
}

export const PROBLEM_JSON = 'application/problem+json';

export function problem(
  status: number,
  errorCode: string,
  detail = 'Detail of the API.',
): Response {
  return new Response(JSON.stringify({ status, errorCode, detail, title: errorCode }), {
    status,
    headers: { 'Content-Type': PROBLEM_JSON },
  });
}

export function createFakeFetch(answer: Answer): FakeFetch {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch(input, init) {
      const call: FetchCall = {
        method: init.method ?? 'GET',
        url: input,
        headers: { ...(init.headers as Record<string, string>) },
        body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
        signal: init.signal ?? null,
      };
      calls.push(call);
      return Promise.resolve().then(() => answer(call));
    },
  };
}

export function createTestBackend(answer: Answer = () => new Response(null, { status: 204 })) {
  const fake = createFakeFetch(answer);
  const sockets = createFakeSocketFactory();
  const backend = createBackend(window, { fetch: fake.fetch, createSocket: sockets.create });
  return { backend, calls: fake.calls, sockets } satisfies TestBackend;
}

export function renderWithBackend(ui: ReactNode, backend: Backend, path = '/'): RenderResult {
  return render(
    <BackendProvider backend={backend}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </BackendProvider>,
  );
}
