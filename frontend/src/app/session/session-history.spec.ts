import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, lobbyDeveloper, revealedDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { SessionHistory } from './session-history';

const SESSION_ID = 'K7P2QX9M';

const unconfirmed = revealedDeveloper.history[0];
const confirmed = { ...unconfirmed, roundNumber: 2, finalCard: '5' as const };

function withHistory(entries: SessionView['history']): SessionView {
  return { ...lobbyDeveloper, history: entries };
}

describe('SessionHistory', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let fixture: ComponentFixture<SessionHistory>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
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
    fixture = TestBed.createComponent(SessionHistory);
    await fixture.whenStable();
  }

  function entries(): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-testid="history-entry"]',
      ),
    );
  }

  function text(element: Element | null): string {
    return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function find(entry: HTMLElement, id: string): Element | null {
    return entry.querySelector(`[data-testid="${id}"]`);
  }

  it('shows Endwert 5 as text in a confirmed entry and ohne Endwert in the other', async () => {
    await open(withHistory([confirmed, unconfirmed]));

    const [first, second] = entries();
    expect(text(first.querySelector('.final'))).toBe('Endwert 5');
    expect(first.querySelector('.final')?.classList).toContain('confirmed');
    expect(text(find(first, 'history-final-card'))).toBe('5');
    expect(find(first, 'history-no-final-card')).toBeNull();
    expect(text(find(second, 'history-no-final-card'))).toBe('ohne Endwert');
    expect(second.querySelector('.final')?.classList).not.toContain('confirmed');
    expect(find(second, 'history-final-card')).toBeNull();
  });

  it('shows issue, round and cards of an entry', async () => {
    await open(withHistory([confirmed]));

    const [entry] = entries();
    expect(text(find(entry, 'history-issue'))).toBe('#42 Login page');
    expect(text(find(entry, 'history-round'))).toBe('Runde 2');
    expect(text(entry.querySelector('.round'))).toBe('Runde 2 · Karten Ben5 · Cem8');
    expect(
      Array.from(entry.querySelectorAll('[data-testid="history-vote"] .card'), (card) =>
        text(card),
      ),
    ).toEqual(['5', '8']);
  });

  it('keeps the selectors of the history', async () => {
    await open(withHistory([unconfirmed]));

    for (const id of [
      'history-panel',
      'history-toggle',
      'history-count',
      'history-entry',
      'history-issue',
      'history-round',
      'history-vote',
      'history-average',
      'history-most-frequent',
      'history-no-final-card',
    ]) {
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`),
        id,
      ).not.toBeNull();
    }
    expect(text((fixture.nativeElement as HTMLElement).querySelector('h2'))).toBe(
      'Sitzungsprotokoll',
    );
  });
});
