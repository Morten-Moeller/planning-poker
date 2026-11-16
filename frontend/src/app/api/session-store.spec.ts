import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authInterceptor } from './auth.interceptor';
import {
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  SessionView,
  votingDeveloper,
  votingScrumMaster,
} from './examples';
import { SessionStore } from './session-store';
import { FakeSocketFactory } from './testing/fake-web-socket';
import { TokenStore } from './token-store';
import { WEB_SOCKET_FACTORY } from './web-socket-factory';

const SESSION_ID = 'K7P2QX9M';

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;

  beforeEach(() => {
    sessionStorage.clear();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
      ],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    store.leave();
    http.verify();
  });

  function enterWith(snapshot: SessionView): void {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: `token-${snapshot.me.participantId}`,
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
  }

  it.each([
    ['lobby scrum master', lobbyScrumMaster, true],
    ['lobby developer', lobbyDeveloper, false],
    ['voting scrum master', votingScrumMaster, true],
    ['voting developer', votingDeveloper, false],
    ['revealed scrum master', revealedScrumMaster, true],
    ['revealed developer', revealedDeveloper, false],
  ])('derives the signals from the example %s', (_name, snapshot, isScrumMaster) => {
    enterWith(snapshot);

    expect(store.session()).toEqual(snapshot);
    expect(store.me()).toEqual(snapshot.me);
    expect(store.role()).toBe(snapshot.me.role);
    expect(store.isScrumMaster()).toBe(isScrumMaster);
    expect(store.phase()).toBe(snapshot.phase);
    expect(store.participants()).toEqual(snapshot.participants);
    expect(store.activeIssue()).toEqual(snapshot.activeIssue);
    expect(store.round()).toEqual(snapshot.round);
    expect(store.history()).toEqual(snapshot.history);
  });

  it('loads the snapshot with the token of the session and then opens the socket', () => {
    TestBed.inject(TokenStore).store(SESSION_ID, { participantId: 'p-1', token: 'token-1' });
    store.enter(SESSION_ID);

    const request = http.expectOne(`/api/sessions/${SESSION_ID}`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(sockets.sockets).toHaveLength(0);
    request.flush(lobbyScrumMaster);

    expect(sockets.last().sent).toEqual([{ type: 'auth', payload: { token: 'token-1' } }]);
  });

  it('replaces every field with the next snapshot, also with null', () => {
    enterWith(revealedScrumMaster);
    expect(store.round()?.stats).not.toBeNull();

    sockets.last().receive({ type: 'session.state', payload: lobbyScrumMaster });

    expect(store.phase()).toBe('LOBBY');
    expect(store.activeIssue()).toBeNull();
    expect(store.round()).toBeNull();
    expect(store.session()).toEqual(lobbyScrumMaster);
  });

  it('stays empty without a token for the session', () => {
    store.enter(SESSION_ID);

    http.expectNone(`/api/sessions/${SESSION_ID}`);
    expect(store.session()).toBeNull();
    expect(store.participants()).toEqual([]);
  });

  it('clears the state and closes the socket on leave', () => {
    enterWith(votingDeveloper);
    const socket = sockets.last();

    store.leave();

    expect(store.session()).toBeNull();
    expect(socket.observed).toBe(false);
  });

  it('clears the state when the snapshot cannot be loaded', () => {
    TestBed.inject(TokenStore).store(SESSION_ID, { participantId: 'p-1', token: 'stale' });
    store.enter(SESSION_ID);

    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Unknown token.',
        errorCode: 'UNAUTHORIZED',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(store.session()).toBeNull();
    expect(sockets.sockets).toHaveLength(0);
  });
});
