import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, lobbyDeveloper, lobbyScrumMaster } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { AppShell } from './app-shell';

const SESSION_ID = 'K7P2QX9M';

describe('AppShell', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let fixture: ComponentFixture<AppShell>;

  beforeEach(async () => {
    sessionStorage.clear();
    const sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    store.leave();
    http.verify();
  });

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    await fixture.whenStable();
  }

  function text(id: string): string | undefined {
    return element(id)?.textContent?.replace(/\s+/g, ' ').trim();
  }

  it('shows only the title outside a session', () => {
    expect(text('toolbar')).toBe('Planning Poker');
    expect(element('toolbar-session-id')).toBeNull();
    expect(element('toolbar-me')).toBeNull();
  });

  it.each([
    ['the scrum master', lobbyScrumMaster, 'Anna · Scrum Master'],
    ['a developer', lobbyDeveloper, 'Ben · Entwickler'],
  ])('shows the session id and name and role of %s', async (_, snapshot, me) => {
    await open(snapshot);

    expect(text('toolbar-session-id')).toBe(SESSION_ID);
    expect(text('toolbar-me')).toBe(me);
  });

  it('removes the session id and name when the session is left', async () => {
    await open(lobbyScrumMaster);

    store.leave();
    await fixture.whenStable();

    expect(element('toolbar-session-id')).toBeNull();
    expect(element('toolbar-me')).toBeNull();
  });
});
