import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createApi } from './api';
import type { Api, Fetch } from './api';
import type { ApiError } from './api-error';
import { createDemoMode } from './demo-mode';
import type { DemoMode } from './demo-mode';
import { createErrorState } from './error-state';
import type { ErrorState } from './error-state';
import { createPreferencesStore } from './preferences-store';
import type { PreferencesStore } from './preferences-store';
import { createRealtime } from './realtime';
import type { Clock, ConnectionState, Realtime, SocketFactory } from './realtime';
import { createRecentSessions } from './recent-sessions';
import type { RecentSessions } from './recent-sessions';
import { createSessionStore } from './session-store';
import type { SessionStore } from './session-store';
import { createTokenStore } from './token-store';
import type { TokenStore } from './token-store';

export interface Backend {
  api: Api;
  demo: DemoMode;
  errors: ErrorState;
  preferences: PreferencesStore;
  recent: RecentSessions;
  tokens: TokenStore;
  realtime: Realtime;
  sessions: SessionStore;
  loadSetting(): Promise<void>;
}

export interface NetworkBoundary {
  fetch: Fetch;
  createSocket: SocketFactory;
}

export type BrowserWindow = Window & typeof globalThis;

function browserNetwork(win: BrowserWindow): NetworkBoundary {
  return {
    fetch: (input, init) => win.fetch(input, init),
    createSocket(url, handlers) {
      const socket = new win.WebSocket(url);
      socket.addEventListener('open', () => handlers.onOpen());
      socket.addEventListener('message', (event: MessageEvent<unknown>) =>
        handlers.onMessage(String(event.data)),
      );
      socket.addEventListener('close', () => handlers.onClose());
      return { send: (data) => socket.send(data), close: () => socket.close() };
    },
  };
}

function browserClock(win: Window): Clock {
  return {
    now: () => Date.now(),
    setTimeout: (handler, delayMs) => win.setTimeout(handler, delayMs),
    clearTimeout: (timer) => win.clearTimeout(timer as number),
    setInterval: (handler, delayMs) => win.setInterval(handler, delayMs),
    clearInterval: (timer) => win.clearInterval(timer as number),
  };
}

export function createBackend(
  win: BrowserWindow,
  network: NetworkBoundary = browserNetwork(win),
): Backend {
  const clock = browserClock(win);
  const errors = createErrorState();
  const preferences = createPreferencesStore(() => win.localStorage);
  const demo = createDemoMode();
  const recent = createRecentSessions(() => win.localStorage, clock.setTimeout, demo);
  const tokens = createTokenStore(() => win.sessionStorage, recent, clock.now);
  const api = createApi(network.fetch, tokens, errors);
  const realtime = createRealtime(
    { createSocket: network.createSocket, location: win.location, clock },
    errors,
  );
  const sessions = createSessionStore(api, realtime, tokens, clock.now);

  return {
    api,
    demo,
    errors,
    preferences,
    recent,
    tokens,
    realtime,
    sessions,
    loadSetting: () => recent.loadSetting((signal) => api.config({ signal, reportError: false })),
  };
}

const BackendContext = createContext<Backend | null>(null);

export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return <BackendContext value={backend}>{children}</BackendContext>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (backend === null) {
    throw new Error('useBackend needs a BackendProvider above the component');
  }
  return backend;
}

export function useLastError(): ApiError | null {
  const { errors } = useBackend();
  return useSyncExternalStore(errors.subscribe, errors.error);
}

export function useConnection(): ConnectionState {
  const { realtime } = useBackend();
  return useSyncExternalStore(realtime.subscribe, realtime.connection);
}
