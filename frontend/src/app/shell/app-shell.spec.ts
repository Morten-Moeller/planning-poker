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
import { ThemeService } from './theme.service';

const SESSION_ID = 'K7P2QX9M';

describe('AppShell', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let fixture: ComponentFixture<AppShell>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
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
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
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

  it('shows only the title and the theme toggle outside a session', () => {
    expect(text('toolbar')).toBe('Planning Poker🌙');
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

  function toggle(): HTMLButtonElement {
    return element('theme-toggle') as HTMLButtonElement;
  }

  it('shows the moon and „Dunkles Design“ in the light design', () => {
    expect(toggle().textContent?.trim()).toBe('🌙');
    expect(toggle().getAttribute('aria-label')).toBe('Dunkles Design');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('🌙');
  });

  it('calls toggle on a click and shows the sun and „Helles Design“ in the dark design', async () => {
    const theme = TestBed.inject(ThemeService);
    const spy = vi.spyOn(theme, 'toggle');

    toggle().click();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledOnce();
    expect(toggle().textContent?.trim()).toBe('☀️');
    expect(toggle().getAttribute('aria-label')).toBe('Helles Design');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the toggle in the room as well', async () => {
    await open(lobbyDeveloper);

    expect(toggle()).not.toBeNull();
  });
});
