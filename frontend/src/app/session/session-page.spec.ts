import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import {
  lobbyDeveloper,
  lobbyScrumMaster,
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
});
