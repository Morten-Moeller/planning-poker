import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { ErrorState } from '../api/error-state';
import { PreferencesStore } from '../api/preferences-store';
import { TokenStore } from '../api/token-store';
import { JoinPage } from './join-page';

@Component({ template: '' })
class EmptyPage {}

const SESSION_ID = 'K7P2QX9M';
const JOIN_URL = `/api/sessions/${SESSION_ID}/participants`;
const INVITE = 'q3Vx8LkP0aZ1bC2dE3fG4hI5jK6lM7nO';

function spacedText(element: Element | null | undefined): string {
  if (!element) {
    return '';
  }
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) {
    const part = (walker.currentNode.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (part !== '') {
      parts.push(part);
    }
  }
  return parts.join(' ');
}

const formErrors: [string, number, string][] = [
  ['NAME_TAKEN', 409, 'Der Name ist in dieser Sitzung schon vergeben.'],
  ['LIMIT_REACHED', 409, 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.'],
  ['VALIDATION_ERROR', 400, 'Die Eingabe ist ungültig.'],
];

describe('JoinPage', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'session/:id/join', component: JoinPage },
          { path: 'session/:id', component: EmptyPage },
          { path: '', pathMatch: 'full', component: EmptyPage },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/session/${SESSION_ID}/join?invite=${INVITE}`);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

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

  function fail(code: string, status: number): void {
    http
      .expectOne(JOIN_URL)
      .flush(
        { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
        { status, statusText: 'Error' },
      );
  }

  it('shows the role and the name rule without a session chip', () => {
    expect(element('join-session-id')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('.session-chip')).toBeNull();
    expect(text('join-role-hint')).toBe(
      'Du trittst als Entwickler bei. Der Name ist für alle sichtbar.',
    );
    expect(harness.routeNativeElement?.querySelector('mat-hint')?.textContent?.trim()).toBe(
      'Höchstens 30 Zeichen',
    );
  });

  it('shows the card hand large above the title, hidden from assistive technology', () => {
    const hand = element('card-hand');
    const cards = Array.from(
      hand?.querySelectorAll<HTMLElement>('[data-testid="card-hand-card"]') ?? [],
    );

    expect(hand?.getAttribute('aria-hidden')).toBe('true');
    expect(hand?.classList).toContain('large');
    expect(hand?.nextElementSibling?.querySelector('h1')).not.toBeNull();
    expect(cards.map((card) => card.className.match(/motif-(\d)/)?.[1])).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(element('join-card-backs')).toBeNull();
  });

  it('saves the name after a successful join and fills it in on the join page of another session', async () => {
    expect((element('join-name') as HTMLInputElement).value).toBe('');

    await submitName('  Ben ');
    http
      .expectOne(JOIN_URL)
      .flush(
        { participantId: 'p-ben', token: 'token-ben' },
        { status: 201, statusText: 'Created' },
      );
    await harness.fixture.whenStable();
    expect(TestBed.inject(PreferencesStore).read().name).toBe('Ben');

    await harness.navigateByUrl(`/session/M3N4P5Q6/join?invite=${INVITE}`);
    expect((element('join-name') as HTMLInputElement).value).toBe('Ben');
  });

  it('does not save the name after NAME_TAKEN', async () => {
    await submitName('Ben');
    fail('NAME_TAKEN', 409);
    await harness.fixture.whenStable();

    expect(TestBed.inject(PreferencesStore).read().name).toBe('');
  });

  it('shows NAME_TAKEN at the name field and clears it with a new name', async () => {
    await submitName('Ben');
    fail('NAME_TAKEN', 409);
    await harness.fixture.whenStable();

    const error = element('join-error');
    expect(error?.closest('mat-form-field')).not.toBeNull();
    expect(spacedText(error?.closest('mat-error'))).toBe(
      '⚠ Der Name ist in dieser Sitzung schon vergeben.',
    );

    const input = element('join-name') as HTMLInputElement;
    input.value = 'Bea';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(element('join-error')).toBeNull();
  });

  it('replaces the form with the state session not found on SESSION_NOT_FOUND', async () => {
    await submitName('Ben');
    fail('SESSION_NOT_FOUND', 404);
    await harness.fixture.whenStable();

    expect(element('join-form')).toBeNull();
    expect(spacedText(element('join-not-found'))).toBe(
      '⚠ Sitzung nicht gefunden Der Link ist abgelaufen oder falsch. Zur Startseite',
    );
    expect(TestBed.inject(ErrorState).error()).toBeNull();
    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();

    element('join-not-found-home')?.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
  });

  it('joins the session in capital letters from a link in small letters', async () => {
    await harness.navigateByUrl(`/session/${SESSION_ID.toLowerCase()}/join?invite=${INVITE}`);

    await submitName('Ben');
    http
      .expectOne(JOIN_URL)
      .flush(
        { participantId: 'p-ben', token: 'token-ben' },
        { status: 201, statusText: 'Created' },
      );
    await harness.fixture.whenStable();

    expect(TestBed.inject(TokenStore).identity(SESSION_ID)?.token).toBe('token-ben');
    expect(router.url).toBe(`/session/${SESSION_ID}`);
  });

  it('joins, stores the token and opens the session room', async () => {
    await submitName(' Ben ');
    const request = http.expectOne(JOIN_URL);
    expect(request.request.body).toEqual({ name: 'Ben', invite: INVITE });
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
    'shows %s with the name kept and stays on the page',
    async (code, status, message) => {
      await submitName('Ben');
      fail(code, status);
      await harness.fixture.whenStable();

      expect(text('join-error')).toBe(message);
      expect((element('join-name') as HTMLInputElement).value).toBe('Ben');
      expect(TestBed.inject(ErrorState).error()).toBeNull();
      expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();
      expect(router.url).toBe(`/session/${SESSION_ID}/join?invite=${INVITE}`);
    },
  );

  it('shows the hint for viewers with as=viewer and sends the same invite', async () => {
    await harness.navigateByUrl(`/session/${SESSION_ID}/join?invite=${INVITE}&as=viewer`);

    expect(text('join-viewer-hint')).toBe(
      'Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.',
    );
    expect(element('join-role-hint')).toBeNull();

    await submitName('Paula');
    const request = http.expectOne(JOIN_URL);
    expect(request.request.body).toEqual({ name: 'Paula', invite: INVITE });
    request.flush(
      { participantId: 'p-paula', token: 'token-paula' },
      { status: 201, statusText: 'Created' },
    );
    await harness.fixture.whenStable();
    expect(router.url).toBe(`/session/${SESSION_ID}`);
  });

  it('shows the developer hint without as=viewer', () => {
    expect(element('join-viewer-hint')).toBeNull();
    expect(element('join-role-hint')).not.toBeNull();
  });

  it.each(['', '?invite=', '?invite=%20%20', '?as=viewer'])(
    'shows the missing invite without a form for the query "%s"',
    async (query) => {
      await harness.navigateByUrl(`/session/${SESSION_ID}/join${query}`);

      expect(text('join-invite-missing')).toBe(
        'Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.',
      );
      expect(element('join-form')).toBeNull();
      expect(element('join-role-hint')).toBeNull();
      expect(element('join-viewer-hint')).toBeNull();
      http.expectNone(JOIN_URL);
    },
  );

  it('replaces the form with the invalid invite on INVITE_INVALID', async () => {
    await submitName('Ben');
    fail('INVITE_INVALID', 403);
    await harness.fixture.whenStable();

    expect(text('join-invite-invalid')).toBe(
      'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
    );
    expect(element('join-form')).toBeNull();
    expect(element('join-role-hint')).toBeNull();
    expect(TestBed.inject(ErrorState).error()).toBeNull();
    expect(TestBed.inject(TokenStore).identity(SESSION_ID)).toBeNull();
    expect(router.url).toBe(`/session/${SESSION_ID}/join?invite=${INVITE}`);
  });
});
