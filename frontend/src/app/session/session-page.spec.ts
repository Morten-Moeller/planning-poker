import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
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
  let fixture: ComponentFixture<SessionPage>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
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
});
