import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { mockBackendInterceptor } from '../api/mock/mock-backend.interceptor';
import { ErrorState } from '../api/error-state';
import { TokenStore } from '../api/token-store';
import { StartPage } from './start-page';

@Component({ template: '' })
class EmptyPage {}

interface InvalidCase {
  name: string;
  values: { name: string; project: string; issue: string };
  errorId: string;
  text: string;
}

const VALID = { name: 'Anna', project: '1234', issue: '42' };

const invalidCases: InvalidCase[] = [
  {
    name: 'an empty name',
    values: { ...VALID, name: '' },
    errorId: 'create-name-error',
    text: 'Bitte einen Namen eingeben',
  },
  {
    name: 'a name of spaces',
    values: { ...VALID, name: '   ' },
    errorId: 'create-name-error',
    text: 'Bitte einen Namen eingeben',
  },
  {
    name: 'a name of 31 characters',
    values: { ...VALID, name: 'A'.repeat(31) },
    errorId: 'create-name-error',
    text: 'Der Name darf höchstens 30 Zeichen haben',
  },
  {
    name: 'an empty project id',
    values: { ...VALID, project: '' },
    errorId: 'create-project-error',
    text: 'Bitte die GitLab-Projekt-ID eingeben',
  },
  {
    name: 'an empty issue number',
    values: { ...VALID, issue: '' },
    errorId: 'create-issue-error',
    text: 'Bitte eine Issue-Nummer ab 1 eingeben',
  },
  {
    name: 'issue number 1.5',
    values: { ...VALID, issue: '1.5' },
    errorId: 'create-issue-error',
    text: 'Bitte eine Issue-Nummer ab 1 eingeben',
  },
  {
    name: 'issue number 0',
    values: { ...VALID, issue: '0' },
    errorId: 'create-issue-error',
    text: 'Bitte eine Issue-Nummer ab 1 eingeben',
  },
];

const formErrors: [string, number, string][] = [
  ['ISSUE_NOT_FOUND', 404, 'Das Issue wurde im GitLab-Projekt nicht gefunden.'],
  ['PROJECT_NOT_ALLOWED', 403, 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.'],
  ['LIMIT_REACHED', 409, 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.'],
  [
    'GITLAB_ACCESS_DENIED',
    502,
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  ],
  ['GITLAB_ERROR', 502, 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.'],
  ['VALIDATION_ERROR', 400, 'Die Eingabe ist ungültig.'],
];

describe('StartPage', () => {
  let fixture: ComponentFixture<StartPage>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'session/:id/join', component: EmptyPage },
          { path: 'session/:id', component: EmptyPage },
        ]),
      ],
    });
    fixture = TestBed.createComponent(StartPage);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.autoDetectChanges();
  });

  afterEach(() => http.verify());

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  function text(id: string): string {
    return (element(id)?.textContent ?? '').trim();
  }

  function type(id: string, value: string): void {
    const input = element(id) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fillCreateForm(values: { name: string; project: string; issue: string }): void {
    type('create-name', values.name);
    type('create-project', values.project);
    type('create-issue', values.issue);
  }

  async function submitCreate(): Promise<void> {
    element('create-submit')?.click();
    await fixture.whenStable();
  }

  function answerHealth(): void {
    http.expectOne('/api/health').flush({ status: 'UP' });
  }

  it('shows that the backend is reachable when it answers UP', async () => {
    answerHealth();
    await fixture.whenStable();

    expect(text('health-status')).toBe('Backend erreichbar');
  });

  it('shows that the backend is unreachable when the request fails', async () => {
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(text('health-status')).toBe('Backend nicht erreichbar');
  });

  it.each(invalidCases)('blocks the submit with $name', async ({ values, errorId, text: t }) => {
    answerHealth();
    fillCreateForm(values);

    await submitCreate();

    http.expectNone('/api/sessions');
    expect(text(errorId)).toBe(t);
  });

  it('creates the session, stores the token and opens the session room', async () => {
    answerHealth();
    fillCreateForm({ name: '  Anna ', project: ' 1234 ', issue: '42' });

    await submitCreate();
    const request = http.expectOne('/api/sessions');
    expect(request.request.body).toEqual({ name: 'Anna', gitlabProjectId: '1234', issueIid: 42 });
    request.flush(
      { sessionId: 'K7P2QX9M', participantId: 'p-anna', token: 'token-anna' },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();

    expect(TestBed.inject(TokenStore).identity('K7P2QX9M')).toEqual({
      participantId: 'p-anna',
      token: 'token-anna',
    });
    expect(router.url).toBe('/session/K7P2QX9M');
  });

  it.each(formErrors)(
    'shows %s at the form, keeps the values and clears the banner',
    async (code, status, message) => {
      answerHealth();
      fillCreateForm({ name: 'Anna', project: '1234', issue: '404' });

      await submitCreate();
      http
        .expectOne('/api/sessions')
        .flush(
          { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
          { status, statusText: 'Error' },
        );
      await fixture.whenStable();

      expect(text('create-error')).toBe(message);
      expect((element('create-name') as HTMLInputElement).value).toBe('Anna');
      expect((element('create-issue') as HTMLInputElement).value).toBe('404');
      expect(TestBed.inject(ErrorState).error()).toBeNull();
      expect(router.url).toBe('/');
    },
  );

  it('writes the typed session id in capitals and opens the join page', async () => {
    answerHealth();
    type('join-session-id-input', 'k7p2qx9m');
    await fixture.whenStable();

    expect((element('join-session-id-input') as HTMLInputElement).value).toBe('K7P2QX9M');

    element('join-session-id-submit')?.click();
    await fixture.whenStable();

    expect(router.url).toBe('/session/K7P2QX9M/join');
  });

  it.each(['K7P2QX9', 'K7P2QX90', ''])(
    'blocks the join with the session id "%s"',
    async (sessionId) => {
      answerHealth();
      type('join-session-id-input', sessionId);

      element('join-session-id-submit')?.click();
      await fixture.whenStable();

      expect(router.url).toBe('/');
      expect(text('join-session-id-error')).toBe(
        'Die Session-ID hat 8 Zeichen aus Großbuchstaben und Ziffern',
      );
    },
  );
});

describe('StartPage project and issue choice', () => {
  let fixture: ComponentFixture<StartPage>;

  function setUp(interceptors: Parameters<typeof withInterceptors>[0], testing: boolean): void {
    sessionStorage.clear();
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors(interceptors)),
        ...(testing ? [provideHttpClientTesting()] : []),
        provideRouter([{ path: 'session/:id', component: EmptyPage }]),
      ],
    });
    fixture = TestBed.createComponent(StartPage);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  function input(id: string): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="${id}"]`,
    ) as HTMLInputElement;
  }

  function overlay(id: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));
  }

  function typeInto(id: string, value: string): void {
    const field = input(id);
    field.focus();
    field.dispatchEvent(new Event('focusin'));
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  async function wait(millis: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(millis);
    fixture.detectChanges();
  }

  function optionTexts(id: string): string[] {
    return overlay(id).map((option) => {
      const lines = Array.from(option.querySelectorAll('.pick-title, .pick-detail'));
      const parts = lines.length > 0 ? lines : [option];
      return parts.map((part) => (part.textContent ?? '').replace(/\s+/g, ' ').trim()).join(' | ');
    });
  }

  function choose(id: string, index: number): void {
    overlay(id)[index].click();
    fixture.detectChanges();
  }

  describe('against the mock backend', () => {
    beforeEach(() => setUp([apiErrorInterceptor, mockBackendInterceptor], false));

    it('searches projects 300 ms after the input and takes the id of the chosen project', async () => {
      typeInto('create-project', 'pok');
      await wait(299);
      expect(overlay('create-project-option')).toHaveLength(0);

      await wait(1);
      expect(optionTexts('create-project-option')).toEqual([
        'Planning Poker | group/planning-poker · 1234',
        'Poker Tools | group/poker-tools · 5678',
      ]);

      choose('create-project-option', 0);
      expect(input('create-project').value).toBe('1234');
    });

    it('shows the issues of the chosen project and takes the iid of the chosen issue', async () => {
      typeInto('create-project', 'pok');
      await wait(300);
      choose('create-project-option', 0);

      typeInto('create-issue', 'login');
      await wait(300);
      expect(optionTexts('create-issue-option')).toEqual(['#42 Login page']);

      choose('create-issue-option', 0);
      expect(input('create-issue').value).toBe('42');
    });

    it('takes a typed project id and issue iid without a choice', async () => {
      const router = TestBed.inject(Router);
      typeInto('create-name', 'Anna');
      typeInto('create-project', '1234');
      typeInto('create-issue', '42');
      await wait(300);

      expect(overlay('create-project-option')).toHaveLength(0);
      expect(overlay('create-issue-option')).toHaveLength(0);
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('[data-testid="create-submit"]')
        ?.click();
      fixture.detectChanges();

      await wait(0);
      expect(TestBed.inject(TokenStore).identity('K7P2QX9M')).not.toBeNull();
      expect(router.url).toBe('/session/K7P2QX9M');
    });

    it('shows that no project and no issue matches', async () => {
      typeInto('create-project', 'kein Treffer');
      await wait(300);
      expect(optionTexts('create-project-empty')).toEqual(['Keine Projekte gefunden']);

      typeInto('create-project', '1234');
      typeInto('create-issue', 'kein Treffer');
      await wait(300);
      expect(optionTexts('create-issue-empty')).toEqual(['Keine Issues gefunden']);
    });
  });

  describe('with failing searches', () => {
    let http: HttpTestingController;

    beforeEach(() => {
      setUp([apiErrorInterceptor], true);
      http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/health').flush({ status: 'UP' });
    });

    afterEach(() => http.verify());

    const searchErrors: [string, number, string][] = [
      [
        'PROJECT_NOT_ALLOWED',
        403,
        'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
      ],
      [
        'GITLAB_ACCESS_DENIED',
        502,
        'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
      ],
      ['GITLAB_ERROR', 502, 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.'],
    ];

    function fail(url: string, code: string, status: number): void {
      http
        .expectOne(url)
        .flush(
          { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
          { status, statusText: 'Error' },
        );
      fixture.detectChanges();
    }

    it.each(searchErrors)(
      'shows %s of the project search at the field and keeps the banner empty',
      async (code, status, message) => {
        typeInto('create-project', 'pok');
        await wait(300);
        fail('/api/projects?search=pok', code, status);

        expect(input('create-project-search-error').textContent?.trim()).toBe(message);
        expect(TestBed.inject(ErrorState).error()).toBeNull();
      },
    );

    it.each(searchErrors)(
      'shows %s of the issue search at the field and keeps the banner empty',
      async (code, status, message) => {
        typeInto('create-project', '1234');
        typeInto('create-issue', 'login');
        await wait(300);
        fail('/api/projects/1234/issues?search=login', code, status);

        expect(input('create-issue-search-error').textContent?.trim()).toBe(message);
        expect(TestBed.inject(ErrorState).error()).toBeNull();
      },
    );
  });
});
