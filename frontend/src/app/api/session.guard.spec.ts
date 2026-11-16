import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { lobbyScrumMaster } from './examples';
import { FakeSocketFactory } from './testing/fake-web-socket';
import { TokenStore } from './token-store';
import { WEB_SOCKET_FACTORY } from './web-socket-factory';

const SESSION_ID = 'K7P2QX9M';

describe('sessionGuard', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  function testId(id: string): HTMLElement | null {
    return harness.routeNativeElement?.querySelector(`[data-testid="${id}"]`) ?? null;
  }

  it('shows the start page at /', async () => {
    await harness.navigateByUrl('/');

    expect(testId('health-status')).not.toBeNull();
  });

  it('shows the join page with the session id at /session/:id/join', async () => {
    await harness.navigateByUrl(`/session/${SESSION_ID}/join`);

    expect(testId('join-session-id')?.textContent).toBe(SESSION_ID);
  });

  it('redirects to the join page without a token for the session', async () => {
    await harness.navigateByUrl(`/session/${SESSION_ID}`);

    expect(router.url).toBe(`/session/${SESSION_ID}/join`);
  });

  it('redirects when only another session has a token', async () => {
    TestBed.inject(TokenStore).store('M3N4P5Q6', { participantId: 'p-ben', token: 'token-ben' });

    await harness.navigateByUrl(`/session/${SESSION_ID}`);

    expect(router.url).toBe(`/session/${SESSION_ID}/join`);
  });

  it('stays in the session room with a token for the session', async () => {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: lobbyScrumMaster.me.participantId,
      token: 'token-anna',
    });

    await harness.navigateByUrl(`/session/${SESSION_ID}`);
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/sessions/${SESSION_ID}`)
      .flush(lobbyScrumMaster);
    await harness.fixture.whenStable();

    expect(router.url).toBe(`/session/${SESSION_ID}`);
    expect(testId('session-id')?.textContent).toBe(SESSION_ID);
    expect(testId('session-role')?.textContent?.trim()).toBe('Scrum Master');
  });
});
