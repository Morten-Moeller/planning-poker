import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { ApiError } from '../api/api-error';
import { ErrorState } from '../api/error-state';
import { lobbyDeveloper } from '../api/examples';
import { RealtimeService } from '../api/realtime.service';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { ErrorBanner } from './error-banner';

const DETAIL = 'Internal detail text of the API.';

const texts: [string, string][] = [
  ['VALIDATION_ERROR', 'Die Eingabe ist ungültig.'],
  ['INVALID_CARD', 'Diese Karte gibt es nicht.'],
  ['UNAUTHORIZED', 'Der Zugang zur Sitzung ist nicht mehr gültig.'],
  ['FORBIDDEN_ROLE', 'Diese Aktion ist für Ihre Rolle nicht erlaubt.'],
  ['PROJECT_NOT_ALLOWED', 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.'],
  ['SESSION_NOT_FOUND', 'Die Sitzung wurde nicht gefunden oder ist abgelaufen.'],
  ['ISSUE_NOT_FOUND', 'Das Issue wurde im GitLab-Projekt nicht gefunden.'],
  ['NAME_TAKEN', 'Der Name ist in dieser Sitzung schon vergeben.'],
  ['INVALID_STATE', 'Die Aktion passt nicht zum aktuellen Stand der Sitzung.'],
  ['LIMIT_REACHED', 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.'],
  [
    'GITLAB_ACCESS_DENIED',
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  ],
  ['GITLAB_ERROR', 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.'],
  ['SOMETHING_NEW', 'Es ist ein Fehler aufgetreten.'],
];

describe('ErrorBanner', () => {
  let fixture: ComponentFixture<ErrorBanner>;
  let errorState: ErrorState;

  let sockets: FakeSocketFactory;

  beforeEach(async () => {
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [{ provide: WEB_SOCKET_FACTORY, useValue: sockets.create }],
    });
    fixture = TestBed.createComponent(ErrorBanner);
    errorState = TestBed.inject(ErrorState);
    await fixture.whenStable();
  });

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  it('shows nothing without an error', () => {
    expect(element('error-banner')).toBeNull();
  });

  it.each(texts)('shows the German text for %s and never the detail', async (code, text) => {
    errorState.report(new ApiError(code, 409, DETAIL));
    await fixture.whenStable();

    expect(element('error-message')?.textContent).toBe(text);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(DETAIL);
  });

  it('hides the banner when the user closes it', async () => {
    errorState.report(new ApiError('NAME_TAKEN', 409, DETAIL));
    await fixture.whenStable();

    element('error-close')?.click();
    await fixture.whenStable();

    expect(element('error-banner')).toBeNull();
    expect(errorState.error()).toBeNull();
  });

  describe('lost connection', () => {
    let connection: Subscription;

    beforeEach(() => {
      vi.useFakeTimers();
      connection = TestBed.inject(RealtimeService).connect('K7P2QX9M', 'token').subscribe();
      sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });
    });

    afterEach(() => {
      connection.unsubscribe();
      vi.useRealTimers();
    });

    async function render(): Promise<void> {
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
    }

    it('counts down to the next attempt and keeps other errors with their text', async () => {
      sockets.last().drop();
      vi.advanceTimersByTime(1_000);
      sockets.last().drop();
      errorState.report(new ApiError('INVALID_STATE', 409, DETAIL));
      await render();

      const banner = element('connection-banner');
      expect(banner?.getAttribute('role')).toBe('alert');
      expect(banner?.textContent).toContain('⚠ Verbindung zum Server unterbrochen.');
      expect(element('connection-retry')?.textContent?.trim()).toBe(
        'Neuer Versuch in 2 s. Deine Karte bleibt erhalten.',
      );
      expect(element('error-message')?.textContent).toBe(
        'Die Aktion passt nicht zum aktuellen Stand der Sitzung.',
      );

      await vi.advanceTimersByTimeAsync(1_000);
      fixture.detectChanges();
      expect(element('connection-retry')?.textContent?.trim()).toBe(
        'Neuer Versuch in 1 s. Deine Karte bleibt erhalten.',
      );
    });

    it('connects at once on „Jetzt verbinden“ and hides the banner with the next snapshot', async () => {
      sockets.last().drop();
      await render();
      expect(sockets.sockets).toHaveLength(1);

      element('connection-reconnect')?.click();
      await render();

      expect(sockets.sockets).toHaveLength(2);
      expect(element('connection-banner')).not.toBeNull();
      sockets.last().receive({ type: 'session.state', payload: lobbyDeveloper });
      await render();
      expect(element('connection-banner')).toBeNull();
    });
  });
});
