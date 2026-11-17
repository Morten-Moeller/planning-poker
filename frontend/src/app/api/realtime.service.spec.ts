import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { ErrorState } from './error-state';
import { lobbyDeveloper, votingDeveloper } from './examples';
import { RealtimeService } from './realtime.service';
import { SessionStore } from './session-store';
import { FakeSocketFactory } from './testing/fake-web-socket';
import { TokenStore } from './token-store';
import { WEB_SOCKET_FACTORY } from './web-socket-factory';

const SESSION_ID = 'K7P2QX9M';
const TOKEN = 'token-of-ben';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let sockets: FakeSocketFactory;
  let subscription: Subscription;

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
      ],
    });
    service = TestBed.inject(RealtimeService);
    subscription = new Subscription();
  });

  afterEach(() => {
    subscription.unsubscribe();
    vi.useRealTimers();
  });

  it('opens the socket of the session and sends auth with the token as the first message', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    expect(sockets.last().url).toBe(`ws://localhost:3000/ws/sessions/${SESSION_ID}`);
    expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
  });

  it('sends ping every 30 seconds after auth', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    vi.advanceTimersByTime(29_999);
    expect(sockets.last().sent).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets.last().sent.at(1)).toEqual({ type: 'ping' });
    vi.advanceTimersByTime(30_000);
    expect(sockets.last().sent.at(2)).toEqual({ type: 'ping' });
  });

  it('replaces the store state in full with every session.state message', () => {
    const store = TestBed.inject(SessionStore);
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: votingDeveloper.me.participantId,
      token: TOKEN,
    });
    store.enter(SESSION_ID);
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/sessions/${SESSION_ID}`)
      .flush(votingDeveloper);
    expect(store.round()).toEqual(votingDeveloper.round);

    sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });

    expect(store.session()).toEqual(lobbyDeveloper);
    expect(store.round()).toBeNull();
    expect(store.activeIssue()).toBeNull();
    store.leave();
  });

  it('exposes round.allVoted as a signal', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    sockets.last().receive({ type: 'round.allVoted', payload: { roundNumber: 2 } });

    expect(service.allVoted()).toEqual({ roundNumber: 2 });
  });

  it('reconnects after 1, 2, 4, 8, 16 and then 30 seconds and sends auth again', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    for (const delayMs of [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]) {
      const openedBefore = sockets.sockets.length;
      sockets.last().drop();

      vi.advanceTimersByTime(delayMs - 1);
      expect(sockets.sockets).toHaveLength(openedBefore);
      vi.advanceTimersByTime(1);
      expect(sockets.sockets).toHaveLength(openedBefore + 1);
      expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
    }
  });

  it('reconnects after the server closed the connection without an error', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    sockets.last().close();
    vi.advanceTimersByTime(1_000);

    expect(sockets.sockets).toHaveLength(2);
    expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
    vi.advanceTimersByTime(30_000);
    expect(sockets.sockets[0].sent).toHaveLength(1);
  });

  it('starts the delays again after a connection that delivered a snapshot', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().drop();
    vi.advanceTimersByTime(1_000);
    sockets.last().drop();
    vi.advanceTimersByTime(2_000);
    sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });

    sockets.last().drop();
    vi.advanceTimersByTime(1_000);

    expect(sockets.sockets).toHaveLength(4);
  });

  it('reports the time of the next attempt while the connection is lost', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });
    expect(service.connection()).toEqual({ status: 'OPEN' });

    sockets.last().drop();

    expect(service.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 1_000 });
    vi.advanceTimersByTime(1_000);
    expect(service.connection()).toEqual({ status: 'CONNECTING' });
    sockets.last().drop();
    expect(service.connection()).toEqual({ status: 'WAITING', retryAt: Date.now() + 2_000 });
  });

  it('reports the open connection again with the next snapshot', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().drop();
    vi.advanceTimersByTime(1_000);

    sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });

    expect(service.connection()).toEqual({ status: 'OPEN' });
  });

  it('reconnects at once on reconnectNow and keeps the delay otherwise', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().drop();
    vi.advanceTimersByTime(1_000);
    sockets.last().drop();
    expect(sockets.sockets).toHaveLength(2);

    service.reconnectNow();

    expect(sockets.sockets).toHaveLength(3);
    expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: TOKEN } }]);
    expect(service.connection()).toEqual({ status: 'CONNECTING' });
    vi.advanceTimersByTime(2_000);
    expect(sockets.sockets).toHaveLength(3);
  });

  it('ignores reconnectNow while the connection is open', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();

    service.reconnectNow();

    expect(sockets.sockets).toHaveLength(1);
  });

  it('reports no lost connection after an error message or after leaving', () => {
    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().drop();
    subscription.unsubscribe();
    expect(service.connection()).toEqual({ status: 'OPEN' });

    subscription = service.connect(SESSION_ID, TOKEN).subscribe();
    sockets.last().receive({
      type: 'error',
      payload: { errorCode: 'UNAUTHORIZED', detail: 'Unknown token.' },
    });
    expect(service.connection()).toEqual({ status: 'OPEN' });
  });

  it('shows the error and does not reconnect after an error message', () => {
    const received: unknown[] = [];
    let completed = false;
    subscription = service.connect(SESSION_ID, TOKEN).subscribe({
      next: (view) => received.push(view),
      complete: () => (completed = true),
    });

    sockets.last().receive({
      type: 'error',
      payload: { errorCode: 'UNAUTHORIZED', detail: 'Unknown token.' },
    });
    vi.advanceTimersByTime(60_000);

    expect(sockets.sockets).toHaveLength(1);
    expect(completed).toBe(true);
    expect(received).toEqual([]);
    expect(TestBed.inject(ErrorState).error()?.errorCode).toBe('UNAUTHORIZED');
  });
});
