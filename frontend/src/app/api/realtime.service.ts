import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import {
  EMPTY,
  Observable,
  Subject,
  concatWith,
  defer,
  filter,
  finalize,
  ignoreElements,
  interval,
  map,
  merge,
  race,
  retry,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { ApiError } from './api-error';
import { ErrorState } from './error-state';
import type { SessionView } from './api.service';
import { WEB_SOCKET_FACTORY, sessionSocketUrl } from './web-socket-factory';
import type { WsMessage, WsRoundAllVoted, WsServerMessage } from './ws-messages';

export const PING_INTERVAL_MS = 30_000;
export const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

export type ConnectionState =
  { status: 'OPEN' } | { status: 'WAITING'; retryAt: number } | { status: 'CONNECTING' };

class ConnectionRejected extends Error {}

class ConnectionClosed extends Error {}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly createSocket = inject(WEB_SOCKET_FACTORY);
  private readonly location = inject(DOCUMENT).location;
  private readonly errorState = inject(ErrorState);
  private readonly lastAllVoted = signal<WsRoundAllVoted['payload'] | null>(null);
  private readonly state = signal<ConnectionState>({ status: 'OPEN' });
  private readonly reconnectRequests = new Subject<void>();

  readonly allVoted = this.lastAllVoted.asReadonly();
  readonly connection = this.state.asReadonly();

  connect(sessionId: string, token: string): Observable<SessionView> {
    const url = sessionSocketUrl(this.location, sessionId);
    return defer(() => this.openSocket(url, token)).pipe(
      retry({
        delay: (error: unknown, retryCount) => this.retryAfter(error, retryCount),
        resetOnSuccess: true,
      }),
      filter((message) => message.type === 'session.state'),
      map((message) => message.payload),
      finalize(() => this.state.set({ status: 'OPEN' })),
    );
  }

  reconnectNow(): void {
    this.reconnectRequests.next();
  }

  private retryAfter(error: unknown, retryCount: number): Observable<unknown> {
    if (error instanceof ConnectionRejected) {
      this.state.set({ status: 'OPEN' });
      return EMPTY;
    }
    const delay = reconnectDelay(retryCount);
    this.state.set({ status: 'WAITING', retryAt: Date.now() + delay });
    return race(timer(delay), this.reconnectRequests).pipe(
      tap(() => this.state.set({ status: 'CONNECTING' })),
    );
  }

  private openSocket(url: string, token: string): Observable<WsServerMessage> {
    const socket = this.createSocket(url);
    const auth = defer(() => {
      socket.next({ type: 'auth', payload: { token } });
      return EMPTY;
    });
    const pings = interval(PING_INTERVAL_MS).pipe(
      tap(() => socket.next({ type: 'ping' })),
      ignoreElements(),
    );
    const messages = fromServer(socket).pipe(concatWith(throwError(() => new ConnectionClosed())));
    return merge(messages, auth, pings).pipe(
      tap((message) => {
        if (message.type === 'session.state') {
          this.state.set({ status: 'OPEN' });
        }
        if (message.type === 'round.allVoted') {
          this.lastAllVoted.set(message.payload);
        }
        if (message.type === 'error') {
          this.errorState.report(
            new ApiError(message.payload.errorCode, null, message.payload.detail),
          );
          throw new ConnectionRejected();
        }
      }),
    );
  }
}

function fromServer(socket: Subject<WsMessage>): Observable<WsServerMessage> {
  return socket.pipe(filter((message): message is WsServerMessage => isServerMessage(message)));
}

function isServerMessage(message: WsMessage): message is WsServerMessage {
  return message.type !== 'auth' && message.type !== 'ping';
}

function reconnectDelay(retryCount: number): number {
  const index = Math.min(retryCount, RECONNECT_DELAYS_MS.length) - 1;
  return RECONNECT_DELAYS_MS[index];
}
