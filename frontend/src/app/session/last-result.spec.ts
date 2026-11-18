import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import {
  SessionView,
  discussionDeveloper,
  lobbyDeveloper,
  lobbyScrumMaster,
  revealedDeveloper,
} from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { LastResult, lastConfirmed } from './last-result';

const SESSION_ID = 'K7P2QX9M';

const unconfirmed = revealedDeveloper.history[0];
const confirmed = { ...unconfirmed, roundNumber: 2, finalCard: '5' as const };

function withHistory(snapshot: SessionView, history: SessionView['history']): SessionView {
  return { ...snapshot, history };
}

describe('lastConfirmed', () => {
  it.each([
    ['a developer in LOBBY after a confirmation', withHistory(lobbyDeveloper, [confirmed]), true],
    [
      'a developer in LOBBY when the newest entry has no final card',
      withHistory(lobbyDeveloper, [unconfirmed, confirmed]),
      false,
    ],
    ['a developer in LOBBY without history', withHistory(lobbyDeveloper, []), false],
    ['a developer after the next release', withHistory(discussionDeveloper, [confirmed]), false],
    ['the scrum master in LOBBY', withHistory(lobbyScrumMaster, [confirmed]), false],
    ['no session', null, false],
  ])('returns an entry for %s: %s', (_, snapshot, shown) => {
    expect(lastConfirmed(snapshot) !== null).toBe(shown);
  });
});

describe('LastResult', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<LastResult>;

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
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    fixture.destroy();
    store.leave();
    http.verify();
  });

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(LastResult);
    await fixture.whenStable();
  }

  function text(id: string): string | null {
    const element = (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
    return element?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  }

  it('shows final card, issue, round and cards to a developer after the confirmation', async () => {
    await open(withHistory(lobbyDeveloper, [confirmed]));

    expect(text('last-result')).toContain('Zuletzt geschätzt');
    expect(text('last-result-final-card')).toBe('5');
    expect(text('last-result-issue')).toBe('#42 Login page');
    expect(text('last-result-round')).toBe('Runde 2');
    expect(text('last-result-cards')).toBe('5 · 8');
    expect(text('last-result-saved')).toBe('Als Kommentar in GitLab gespeichert');
  });

  it('links the issue in GitLab in a new tab when the project is known', async () => {
    await open(withHistory(lobbyDeveloper, [confirmed]));

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="last-result-open"]',
    );
    expect(link?.textContent?.trim()).toBe('In GitLab öffnen ↗');
    expect(link?.getAttribute('href')).toBe('https://gitlab.com/webshop/frontend/-/issues/42');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows the arrow of the GitLab link in its own hidden span with the class app-symbol', async () => {
    await open(withHistory(lobbyDeveloper, [confirmed]));

    const symbol = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-testid="last-result-open"] .app-symbol',
    )!;
    expect(symbol.textContent).toBe('↗');
    expect(symbol.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no link when the project is unknown', async () => {
    await open({ ...withHistory(lobbyDeveloper, [confirmed]), project: null });

    expect(text('last-result')).toContain('Zuletzt geschätzt');
    expect(text('last-result-open')).toBeNull();
  });

  it('disappears with the next release', async () => {
    await open(withHistory(lobbyDeveloper, [confirmed]));

    sockets.last().receive({
      type: 'session.state',
      payload: withHistory(discussionDeveloper, [confirmed]),
    });
    await fixture.whenStable();

    expect(text('last-result')).toBeNull();
  });

  it('is never shown to the scrum master', async () => {
    await open(withHistory(lobbyScrumMaster, [confirmed]));

    expect(text('last-result')).toBeNull();
  });
});
