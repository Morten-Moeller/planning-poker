import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { ErrorState } from '../api/error-state';
import { TokenStore } from '../api/token-store';
import { JoinPage } from './join-page';

@Component({ template: '' })
class EmptyPage {}

const SESSION_ID = 'K7P2QX9M';
const JOIN_URL = `/api/sessions/${SESSION_ID}/participants`;

const formErrors: [string, number, string][] = [
  ['SESSION_NOT_FOUND', 404, 'Die Sitzung wurde nicht gefunden oder ist abgelaufen.'],
  ['NAME_TAKEN', 409, 'Der Name ist in dieser Sitzung schon vergeben.'],
];

describe('JoinPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'session/:id/join', component: JoinPage },
          { path: 'session/:id', component: EmptyPage },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/session/${SESSION_ID}/join`);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  function element(id: string): HTMLElement | null {
    return harness.routeNativeElement?.querySelector(`[data-testid="${id}"]`) ?? null;
  }

  function text(id: string): string {
    return (element(id)?.textContent ?? '').trim();
  }

  async function submitName(name: string): Promise<void> {
    const input = element('join-name') as HTMLInputElement;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    element('join-submit')?.click();
    await harness.fixture.whenStable();
  }

  it('joins, stores the token and opens the session room', async () => {
    await submitName(' Ben ');
    const request = http.expectOne(JOIN_URL);
    expect(request.request.body).toEqual({ name: 'Ben' });
    request.flush(
      { participantId: 'p-ben', token: 'token-ben' },
      { status: 201, statusText: 'Created' },
    );
    await harness.fixture.whenStable();

    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toEqual({
      participantId: 'p-ben',
      token: 'token-ben',
    });
    expect(router.url).toBe(`/session/${SESSION_ID}`);
  });

  it.each(['', '   ', 'B'.repeat(31)])('blocks the join with the name "%s"', async (name) => {
    await submitName(name);

    http.expectNone(JOIN_URL);
    expect(element('join-name-error')).not.toBeNull();
  });

  it.each(formErrors)(
    'shows %s at the form and stays on the page',
    async (code, status, message) => {
      await submitName('Ben');
      http
        .expectOne(JOIN_URL)
        .flush(
          { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
          { status, statusText: 'Error' },
        );
      await harness.fixture.whenStable();

      expect(text('join-error')).toBe(message);
      expect((element('join-name') as HTMLInputElement).value).toBe('Ben');
      expect(TestBed.inject(ErrorState).error()).toBeNull();
      expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();
      expect(router.url).toBe(`/session/${SESSION_ID}/join`);
    },
  );
});
