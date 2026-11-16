import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, votingDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { RoundTimer, formatRemaining, remainingSeconds } from './round-timer';

const SESSION_ID = 'K7P2QX9M';
const SERVER_TIME = '2026-11-16T09:15:00Z';
const CLIENT_AHEAD_MS = 90_000;

function withDeadline(deadline: string | null, serverTime = SERVER_TIME): SessionView {
  return { ...votingDeveloper, serverTime, round: { ...votingDeveloper.round!, deadline } };
}

describe('remainingSeconds and formatRemaining', () => {
  it.each([
    [42_000, 42],
    [41_001, 42],
    [500, 1],
    [0, 0],
    [-5_000, 0],
  ])('rounds %i ms up to %i s and never below 0', (left, expected) => {
    const now = Date.parse(SERVER_TIME);
    expect(remainingSeconds(new Date(now + left).toISOString(), now)).toBe(expected);
  });

  it.each([
    [42, '0:42'],
    [5, '0:05'],
    [60, '1:00'],
    [125, '2:05'],
    [3600, '60:00'],
  ])('formats %i s as %s', (seconds, text) => {
    expect(formatRemaining(seconds)).toBe(text);
  });
});

describe('RoundTimer', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<RoundTimer>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(Date.parse(SERVER_TIME) + CLIENT_AHEAD_MS);
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
    vi.useRealTimers();
  });

  async function open(snapshot: SessionView): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(RoundTimer);
    await fixture.whenStable();
  }

  async function tick(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await fixture.whenStable();
  }

  function timer(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="round-timer"]');
  }

  it('shows the remaining time from the server time, not from the client clock', async () => {
    await open(withDeadline('2026-11-16T09:15:42Z'));

    expect(timer()?.getAttribute('role')).toBe('timer');
    expect(timer()?.textContent?.trim()).toBe('Noch 0:42');
  });

  it('counts down every second and shows the end at 0', async () => {
    await open(withDeadline('2026-11-16T09:15:42Z'));

    await tick(1000);
    expect(timer()?.textContent?.trim()).toBe('Noch 0:41');

    await tick(40_000);
    expect(timer()?.textContent?.trim()).toBe('Noch 0:01');

    await tick(1000);
    expect(timer()?.textContent?.trim()).toBe('Zeit abgelaufen');

    await tick(5000);
    expect(timer()?.textContent?.trim()).toBe('Zeit abgelaufen');
  });

  it('takes the offset of every new snapshot', async () => {
    await open(withDeadline('2026-11-16T09:15:42Z'));

    sockets.last().receive({
      type: 'session.state',
      payload: withDeadline('2026-11-16T09:15:42Z', '2026-11-16T09:15:30Z'),
    });
    await tick(0);

    expect(timer()?.textContent?.trim()).toBe('Noch 0:12');
  });

  it('shows minutes for a long deadline', async () => {
    await open(withDeadline('2026-11-16T09:20:00Z'));

    expect(timer()?.textContent?.trim()).toBe('Noch 5:00');
  });

  it('shows nothing without a deadline', async () => {
    await open(withDeadline(null));

    expect(timer()).toBeNull();
  });
});
