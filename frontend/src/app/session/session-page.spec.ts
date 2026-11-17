import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { ErrorState } from '../api/error-state';
import {
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
  revealedScrumMaster,
  SessionView,
  votingDeveloper,
  votingScrumMaster,
} from '../api/examples';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { SessionPage } from './session-page';

const SESSION_ID = 'K7P2QX9M';

describe('SessionPage', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let fixture: ComponentFixture<SessionPage>;

  beforeEach(() => {
    sessionStorage.clear();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: SESSION_ID }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    fixture = TestBed.createComponent(SessionPage);
    await fixture.whenStable();
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    await fixture.whenStable();
  }

  function count(id: string): number {
    return (fixture.nativeElement as HTMLElement).querySelectorAll(`[data-testid="${id}"]`).length;
  }

  it.each([
    ['LOBBY', lobbyDeveloper],
    ['VOTING', votingDeveloper],
  ])('renders no controls of the scrum master for a developer in %s', async (_phase, snapshot) => {
    await open(snapshot);

    expect(count('participant-list')).toBe(1);
    expect(count('issue-panel')).toBe(0);
    expect(count('issue-release')).toBe(0);
    expect(count('issue-search-input')).toBe(0);
    expect(count('timer-setting')).toBe(0);
    http.expectNone((request) => request.url.endsWith('/issues'));
  });

  it('shows the waiting state and no issue to a developer in the lobby', async () => {
    await open(lobbyDeveloper);

    expect(count('lobby-waiting')).toBe(1);
    expect(count('active-issue')).toBe(0);
  });

  it('shows the active issue and no waiting state to a developer while voting', async () => {
    await open(votingDeveloper);

    expect(count('lobby-waiting')).toBe(0);
    expect(count('active-issue')).toBe(1);
  });

  it.each([
    ['LOBBY', lobbyScrumMaster],
    ['VOTING', votingScrumMaster],
  ])('renders the panel for the scrum master in %s', async (_phase, snapshot) => {
    await open(snapshot);

    expect(count('issue-panel')).toBe(1);
    expect(count('timer-setting')).toBe(1);
    expect(count('lobby-waiting')).toBe(0);
    http
      .expectOne((request) => request.url === `/api/sessions/${SESSION_ID}/issues`)
      .flush({ items: [], nextPage: null });
  });

  it('shows the card deck and the counter but no reveal button to a developer while voting', async () => {
    await open(votingDeveloper);

    expect(count('card-deck')).toBe(1);
    expect(count('vote-counter')).toBe(1);
    expect(count('round-reveal')).toBe(0);
    expect(count('all-voted-hint')).toBe(0);
  });

  it('shows the reveal button and the counter but no card deck to the scrum master while voting', async () => {
    await open(votingScrumMaster);

    expect(count('card-deck')).toBe(0);
    expect(count('vote-counter')).toBe(1);
    expect(count('round-reveal')).toBe(1);
    http
      .expectOne((request) => request.url === `/api/sessions/${SESSION_ID}/issues`)
      .flush({ items: [], nextPage: null });
  });

  it('shows the remaining time while voting with a deadline', async () => {
    await open(votingDeveloper);

    expect(count('round-timer')).toBe(1);
  });

  it.each([
    [
      'VOTING without deadline',
      { ...votingDeveloper, round: { ...votingDeveloper.round!, deadline: null } },
    ],
    ['REVEALED', revealedDeveloper],
  ])('shows no remaining time in %s', async (_name, snapshot) => {
    await open(snapshot);

    expect(count('round-timer')).toBe(0);
  });

  it.each([
    ['LOBBY', lobbyDeveloper],
    ['REVEALED', revealedDeveloper],
  ])('renders no card deck and no counter for a developer in %s', async (_phase, snapshot) => {
    await open(snapshot);

    expect(count('card-deck')).toBe(0);
    expect(count('vote-counter')).toBe(0);
  });

  it('shows the result and the history but no action to a developer after the reveal', async () => {
    await open(revealedDeveloper);

    expect(count('round-result')).toBe(1);
    expect(count('result-vote')).toBe(2);
    expect(count('round-restart')).toBe(0);
    expect(count('result-accept')).toBe(0);
    expect(count('history-panel')).toBe(1);
    expect(count('history-entry')).toBe(1);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[data-testid="history-count"]')
        ?.textContent?.trim(),
    ).toBe('1 aufgelöste Runde');
  });

  it('shows the result with both actions and the history to the scrum master after the reveal', async () => {
    await open(revealedScrumMaster);

    expect(count('round-result')).toBe(1);
    expect(count('round-restart')).toBe(1);
    expect(count('result-accept')).toBe(1);
    expect(count('history-panel')).toBe(1);
    http
      .expectOne((request) => request.url === `/api/sessions/${SESSION_ID}/issues`)
      .flush({ items: [], nextPage: null });
  });

  it.each([
    ['LOBBY', lobbyDeveloper],
    ['VOTING', votingDeveloper],
  ])('renders no result and no empty history in %s', async (_phase, snapshot) => {
    await open(snapshot);

    expect(count('round-result')).toBe(0);
    expect(count('history-panel')).toBe(0);
  });

  it('shows the history in the lobby once a round was revealed', async () => {
    await open({ ...lobbyDeveloper, history: revealedDeveloper.history });

    expect(count('round-result')).toBe(0);
    expect(count('history-panel')).toBe(1);
    expect(count('history-entry')).toBe(1);
  });

  it('renders no reveal button for the scrum master after the reveal', async () => {
    await open(revealedScrumMaster);

    expect(count('round-reveal')).toBe(0);
    expect(count('card-deck')).toBe(0);
    http
      .expectOne((request) => request.url === `/api/sessions/${SESSION_ID}/issues`)
      .flush({ items: [], nextPage: null });
  });

  function storeToken(): void {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: lobbyDeveloper.me.participantId,
      token: 'token',
    });
  }

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  it('shows the gone state with a link to the start page when the API does not find the session', async () => {
    storeToken();
    fixture = TestBed.createComponent(SessionPage);
    await fixture.whenStable();

    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(
      { errorCode: 'SESSION_NOT_FOUND', title: 'Not Found', status: 404 },
      {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
    await fixture.whenStable();

    expect(element('session-gone')?.textContent).toContain(
      'Diese Sitzung ist abgelaufen oder existiert nicht.',
    );
    expect(element('session-gone-home')?.getAttribute('href')).toBe('/');
    expect(count('session-loading')).toBe(0);
    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();
    expect(TestBed.inject(ErrorState).error()).toBeNull();
  });

  it('shows the gone state when the WebSocket does not find the session', async () => {
    await open(lobbyDeveloper);

    sockets.last().receive({
      type: 'error',
      payload: { errorCode: 'SESSION_NOT_FOUND', detail: 'Session not found.' },
    });
    await fixture.whenStable();

    expect(count('session-gone')).toBe(1);
    expect(count('participant-list')).toBe(0);
    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();
  });

  it('keeps the token and shows no gone state for another error', async () => {
    storeToken();
    fixture = TestBed.createComponent(SessionPage);
    await fixture.whenStable();

    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(
      { errorCode: 'UNAUTHORIZED', title: 'Unauthorized', status: 401 },
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
    await fixture.whenStable();

    expect(count('session-gone')).toBe(0);
    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).not.toBeNull();
  });
});
