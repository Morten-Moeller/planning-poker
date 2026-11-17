import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { SessionView, lobbyScrumMaster } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { TimerSetting } from './timer-setting';

const SESSION_ID = 'K7P2QX9M';
const TIMER_URL = `/api/sessions/${SESSION_ID}/timer`;

function withTimer(timerSeconds: number | null): SessionView {
  return { ...lobbyScrumMaster, timerSeconds };
}

describe('TimerSetting', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<TimerSetting>;
  let select: MatSelectHarness;

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
    fixture = TestBed.createComponent(TimerSetting);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    await fixture.whenStable();
    select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
  }

  it('offers the fixed durations under the label Timer', async () => {
    await open(withTimer(null));

    const label = (fixture.nativeElement as HTMLElement).querySelector('mat-label');
    expect(label?.textContent?.trim()).toBe('Timer');
    await select.open();
    const options = await select.getOptions();
    expect(await Promise.all(options.map((option) => option.getText()))).toEqual([
      'Aus',
      '15 s',
      '30 s',
      '1 min',
      '2 min',
      '5 min',
    ]);
  });

  it('shows the hint that the timer applies from the next round', async () => {
    await open(withTimer(60));

    const hint = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="timer-setting-hint"]',
    );
    expect(hint?.textContent?.trim()).toBe('Gilt ab der nächsten Runde.');
  });

  it.each([
    [null, 'Aus'],
    [30, '30 s'],
    [300, '5 min'],
  ])('shows the value %s of the snapshot as %s', async (timerSeconds, text) => {
    await open(withTimer(timerSeconds));

    expect(await select.getValueText()).toBe(text);
  });

  it('follows the next snapshot', async () => {
    await open(withTimer(null));

    sockets.last().receive({ type: 'session.state', payload: withTimer(120) });
    await fixture.whenStable();

    expect(await select.getValueText()).toBe('2 min');
  });

  it.each([
    ['15 s', 15],
    ['1 min', 60],
  ])('sends %s at once as %i seconds', async (text, seconds) => {
    await open(withTimer(null));

    await select.open();
    await select.clickOptions({ text });

    const request = http.expectOne(TIMER_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ seconds });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('sends null for Aus', async () => {
    await open(withTimer(30));

    await select.open();
    await select.clickOptions({ text: 'Aus' });

    const request = http.expectOne(TIMER_URL);
    expect(request.request.body).toEqual({ seconds: null });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
