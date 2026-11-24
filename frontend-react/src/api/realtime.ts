import type { SessionView } from './api';
import { ApiError } from './api-error';
import type { ErrorState } from './error-state';
import type { WsClientMessage, WsRoundAllVoted, WsServerMessage } from './ws-messages';

export const PING_INTERVAL_MS = 30_000;
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 4_000, 8_000, 16_000];
export const RECONNECT_DELAY_MAX_MS = 30_000;

export type ConnectionState =
  { status: 'OPEN' } | { status: 'WAITING'; retryAt: number } | { status: 'CONNECTING' };

export type AllVoted = WsRoundAllVoted['payload'];

export interface SocketHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onClose(): void;
}

export interface SessionSocket {
  send(data: string): void;
  close(): void;
}

export type SocketFactory = (url: string, handlers: SocketHandlers) => SessionSocket;

export interface Clock {
  now(): number;
  setTimeout(handler: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
  setInterval(handler: () => void, delayMs: number): unknown;
  clearInterval(timer: unknown): void;
}

export interface RealtimePlatform {
  createSocket: SocketFactory;
  location: Pick<Location, 'protocol' | 'host'>;
  clock: Clock;
}

export interface Realtime {
  connect(
    sessionId: string,
    token: string,
    onSnapshot: (view: SessionView) => void,
    onEnd: () => void,
  ): () => void;
  reconnectNow(): void;
  connection(): ConnectionState;
  allVoted(): AllVoted | null;
  subscribe(listener: () => void): () => void;
}

interface Connection {
  url: string;
  token: string;
  onSnapshot: (view: SessionView) => void;
  onEnd: () => void;
  socket: SessionSocket | null;
  ping: unknown;
  retry: unknown;
  attempts: number;
}

const OPEN: ConnectionState = { status: 'OPEN' };
const CONNECTING: ConnectionState = { status: 'CONNECTING' };

export function sessionSocketUrl(
  location: Pick<Location, 'protocol' | 'host'>,
  sessionId: string,
): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/ws/sessions/${encodeURIComponent(sessionId)}`;
}

const TYPES_WITH_PAYLOAD: readonly string[] = ['session.state', 'round.allVoted', 'error'];

function isServerMessage(message: unknown): message is WsServerMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const { type, payload } = message as Record<string, unknown>;
  if (typeof type !== 'string') {
    return false;
  }
  return !TYPES_WITH_PAYLOAD.includes(type) || (typeof payload === 'object' && payload !== null);
}

function parse(data: string): WsServerMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    return isServerMessage(message) ? message : null;
  } catch {
    return null;
  }
}

export function createRealtime(platform: RealtimePlatform, errors: ErrorState): Realtime {
  const { createSocket, clock } = platform;
  const listeners = new Set<() => void>();
  let state: ConnectionState = OPEN;
  let lastAllVoted: AllVoted | null = null;
  let active: Connection | null = null;

  const notify = () => listeners.forEach((listener) => listener());

  const setState = (next: ConnectionState) => {
    if (next !== state) {
      state = next;
      notify();
    }
  };

  const release = (connection: Connection) => {
    clock.clearInterval(connection.ping);
    clock.clearTimeout(connection.retry);
    connection.ping = null;
    connection.retry = null;
    const socket = connection.socket;
    connection.socket = null;
    socket?.close();
  };

  const end = (connection: Connection) => {
    active = null;
    release(connection);
    setState(OPEN);
  };

  const open = (connection: Connection) => {
    const send = (socket: SessionSocket, message: WsClientMessage) =>
      socket.send(JSON.stringify(message));
    const current = () => active === connection && connection.socket === socket;

    const lost = () => {
      release(connection);
      connection.attempts += 1;
      const delay = RECONNECT_DELAYS_MS[connection.attempts - 1] ?? RECONNECT_DELAY_MAX_MS;
      connection.retry = clock.setTimeout(() => retry(connection), delay);
      setState({ status: 'WAITING', retryAt: clock.now() + delay });
    };

    const socket: SessionSocket = createSocket(connection.url, {
      onOpen() {
        if (!current()) {
          return;
        }
        send(socket, { type: 'auth', payload: { token: connection.token } });
        connection.ping = clock.setInterval(() => send(socket, { type: 'ping' }), PING_INTERVAL_MS);
      },
      onMessage(data) {
        if (!current()) {
          return;
        }
        const message = parse(data);
        if (message === null) {
          lost();
          return;
        }
        if (message.type === 'session.state') {
          connection.attempts = 0;
          setState(OPEN);
          connection.onSnapshot(message.payload);
        }
        if (message.type === 'round.allVoted') {
          lastAllVoted = message.payload;
          notify();
        }
        if (message.type === 'error') {
          errors.report(new ApiError(message.payload.errorCode, null, message.payload.detail));
          end(connection);
          connection.onEnd();
        }
      },
      onClose() {
        if (current()) {
          lost();
        }
      },
    });
    connection.socket = socket;
  };

  const retry = (connection: Connection) => {
    if (active !== connection) {
      return;
    }
    clock.clearTimeout(connection.retry);
    connection.retry = null;
    setState(CONNECTING);
    open(connection);
  };

  return {
    connect(sessionId, token, onSnapshot, onEnd) {
      if (active !== null) {
        end(active);
      }
      const connection: Connection = {
        url: sessionSocketUrl(platform.location, sessionId),
        token,
        onSnapshot,
        onEnd,
        socket: null,
        ping: null,
        retry: null,
        attempts: 0,
      };
      active = connection;
      open(connection);
      return () => {
        if (active === connection) {
          end(connection);
        }
      };
    },
    reconnectNow() {
      if (active !== null && state.status === 'WAITING') {
        retry(active);
      }
    },
    connection: () => state,
    allVoted: () => lastAllVoted,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
