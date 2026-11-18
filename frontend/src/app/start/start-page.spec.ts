import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { mockBackendInterceptor } from '../api/mock/mock-backend.interceptor';
import { ErrorState } from '../api/error-state';
import { Preferences, PreferencesStore } from '../api/preferences-store';
import { discussionDeveloper, lobbyScrumMaster } from '../api/examples';
import { RECENT_SESSIONS_KEY, RecentSession, RecentSessions } from '../api/recent-sessions';
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
    name: 'issue number abc',
    values: { ...VALID, issue: 'abc' },
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
    localStorage.clear();
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

  it.each(['', '   '])(
    'creates the session without issueIid when the issue field holds "%s"',
    async (issue) => {
      answerHealth();
      fillCreateForm({ name: 'Anna', project: '1234', issue });

      await submitCreate();
      const request = http.expectOne('/api/sessions');
      expect(request.request.body).toEqual({ name: 'Anna', gitlabProjectId: '1234' });
      request.flush(
        { sessionId: 'K7P2QX9M', participantId: 'p-anna', token: 'token-anna' },
        { status: 201, statusText: 'Created' },
      );
      await fixture.whenStable();

      expect(router.url).toBe('/session/K7P2QX9M');
    },
  );

  it('labels the issue field as optional with a hint', async () => {
    answerHealth();
    await fixture.whenStable();

    const form = element('create-form');
    expect(form?.textContent).toContain('Issue (optional)');
    expect(form?.textContent).toContain('Optional: Issue, mit dem die Sitzung startet');
  });

  it('shows PROJECT_NOT_FOUND at the project field and clears it after a change', async () => {
    answerHealth();
    fillCreateForm({ name: 'Anna', project: '999999', issue: '' });

    await submitCreate();
    http.expectOne('/api/sessions').flush(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'detail',
        errorCode: 'PROJECT_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();

    expect(text('create-project-error')).toBe('Das GitLab-Projekt wurde nicht gefunden.');
    expect(element('create-error')).toBeNull();
    expect(TestBed.inject(ErrorState).error()).toBeNull();
    expect(router.url).toBe('/');

    type('create-project', '1234');
    await fixture.whenStable();

    expect(element('create-project-error')).toBeNull();
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

  it('locks the create form without backend and frees it after a new check', async () => {
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(text('health-down')).toContain(
      'Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.',
    );
    expect(text('create-submit')).toBe('Sitzung erstellen (Backend fehlt)');
    expect((element('create-submit') as HTMLButtonElement).disabled).toBe(true);

    element('health-retry')?.click();
    await fixture.whenStable();
    expect(text('health-status')).toBe('Backend wird geprüft …');
    expect((element('create-submit') as HTMLButtonElement).disabled).toBe(true);
    answerHealth();
    await fixture.whenStable();

    expect(text('health-status')).toBe('Backend erreichbar');
    expect(element('health-down')).toBeNull();
    expect(text('create-submit')).toBe('Sitzung erstellen');
    expect((element('create-submit') as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps the forms locked when the new check fails again', async () => {
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    element('health-retry')?.click();
    await fixture.whenStable();
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(text('health-status')).toBe('Backend nicht erreichbar');
    expect((element('create-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the intro and only the panel to create a session', async () => {
    answerHealth();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Issues gemeinsam schätzen');
    expect(
      Array.from(page.querySelectorAll('.panel-head')).map((head) => spacedText(head)),
    ).toEqual(['Sitzung erstellen Für den Scrum Master']);
    for (const id of [
      'join-form',
      'join-session-id-input',
      'join-session-id-submit',
      'join-session-id-error',
    ]) {
      expect(element(id), id).toBeNull();
    }
  });
});

describe('StartPage project and issue choice', () => {
  let fixture: ComponentFixture<StartPage>;

  function setUp(
    interceptors: Parameters<typeof withInterceptors>[0],
    testing: boolean,
    saved: Partial<Preferences> = {},
  ): void {
    sessionStorage.clear();
    localStorage.clear();
    new PreferencesStore().save(saved);
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

  describe('with a saved project', () => {
    beforeEach(() => {
      setUp([apiErrorInterceptor, mockBackendInterceptor], false, {
        name: 'Anna',
        projectId: '1234',
      });
    });

    it('keeps the project list closed on focus and searches the issues of the saved project', async () => {
      const project = input('create-project');
      project.focus();
      project.dispatchEvent(new Event('focusin'));
      fixture.detectChanges();
      await wait(300);
      expect(overlay('create-project-option')).toHaveLength(0);

      typeInto('create-issue', 'login');
      await wait(300);
      expect(optionTexts('create-issue-option')).toEqual(['#42 Login page']);
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

    it('loads all projects on focus of the empty field, searches a text and skips a number', async () => {
      input('create-project').focus();
      fixture.detectChanges();
      await wait(0);
      http.expectOne('/api/projects').flush({
        items: [
          {
            id: 1234,
            name: 'Planning Poker',
            pathWithNamespace: 'group/planning-poker',
            webUrl: 'https://gitlab.example/group/planning-poker',
          },
          {
            id: 9012,
            name: 'Release Notes',
            pathWithNamespace: 'group/release-notes',
            webUrl: 'https://gitlab.example/group/release-notes',
          },
        ],
        nextPage: null,
      });
      fixture.detectChanges();
      expect(optionTexts('create-project-option')).toEqual([
        'Planning Poker | group/planning-poker · 1234',
        'Release Notes | group/release-notes · 9012',
      ]);

      typeInto('create-project', 'pok');
      await wait(300);
      http.expectOne('/api/projects?search=pok').flush({ items: [], nextPage: null });

      typeInto('create-project', '1234');
      await wait(300);
      http.expectNone((request) => request.url === '/api/projects');
      http.expectOne('/api/projects/1234/issues').flush({ items: [], nextPage: null });

      typeInto('create-project', '');
      input('create-project').blur();
      input('create-project').focus();
      await wait(0);
      http.expectOne('/api/projects').flush({ items: [], nextPage: null });
    });

    it('drops a late project result after the field holds an id', async () => {
      typeInto('create-project', 'pok');
      await wait(300);
      const pending = http.expectOne('/api/projects?search=pok');
      typeInto('create-project', '1234');
      pending.flush({
        items: [
          {
            id: 1234,
            name: 'Planning Poker',
            pathWithNamespace: 'group/planning-poker',
            webUrl: 'https://gitlab.example/group/planning-poker',
          },
        ],
        nextPage: null,
      });
      fixture.detectChanges();

      expect(overlay('create-project-option')).toHaveLength(0);
      await wait(300);
      http.expectOne('/api/projects/1234/issues').flush({ items: [], nextPage: null });
    });

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

describe('StartPage preferences', () => {
  let fixture: ComponentFixture<StartPage>;
  let http: HttpTestingController;
  let router: Router;
  let preferences: PreferencesStore;

  const CREATED = { sessionId: 'K7P2QX9M', participantId: 'p-anna', token: 'token-anna' };
  const TIMER_URL = '/api/sessions/K7P2QX9M/timer';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'session/:id', component: EmptyPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    preferences = TestBed.inject(PreferencesStore);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    localStorage.clear();
  });

  async function openPage(): Promise<void> {
    fixture = TestBed.createComponent(StartPage);
    fixture.autoDetectChanges();
    http.expectOne('/api/health').flush({ status: 'UP' });
    await fixture.whenStable();
  }

  function input(id: string): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="${id}"]`,
    ) as HTMLInputElement;
  }

  function type(id: string, value: string): void {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function create(name: string, project: string): Promise<void> {
    type('create-name', name);
    type('create-project', project);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="create-submit"]')
      ?.click();
    await fixture.whenStable();
  }

  it('saves name and project after a successful creation and fills them in next time', async () => {
    await openPage();
    expect(input('create-name').value).toBe('');
    expect(input('create-project').value).toBe('');

    await create('  Anna ', ' 1234 ');
    http.expectOne('/api/sessions').flush(CREATED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(preferences.read()).toMatchObject({ name: 'Anna', projectId: '1234' });
    fixture.destroy();

    await openPage();
    expect(input('create-name').value).toBe('Anna');
    expect(input('create-project').value).toBe('1234');
    expect(input('create-issue').value).toBe('');
  });

  it('saves nothing after PROJECT_NOT_FOUND', async () => {
    await openPage();

    await create('Anna', '999999');
    http.expectOne('/api/sessions').flush(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'detail',
        errorCode: 'PROJECT_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();

    expect(preferences.read()).toMatchObject({ name: '', projectId: '' });
    expect(localStorage.getItem('planningpoker.preferences')).toBeNull();
  });

  it('sets the saved timer of 30 s after the creation and opens the session afterwards', async () => {
    preferences.save({ timerSeconds: 30 });
    await openPage();

    await create('Anna', '1234');
    http.expectOne('/api/sessions').flush(CREATED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(router.url).toBe('/');

    const request = http.expectOne(TIMER_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ seconds: 30 });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(router.url).toBe('/session/K7P2QX9M');
  });

  it('sets no timer when the saved timer is Aus', async () => {
    preferences.save({ timerSeconds: 0 });
    await openPage();

    await create('Anna', '1234');
    http.expectOne('/api/sessions').flush(CREATED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    http.expectNone(TIMER_URL);
    expect(router.url).toBe('/session/K7P2QX9M');
  });

  it('opens the session when setting the saved timer fails', async () => {
    preferences.save({ timerSeconds: 30 });
    await openPage();

    await create('Anna', '1234');
    http.expectOne('/api/sessions').flush(CREATED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http.expectOne(TIMER_URL).flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'detail',
        errorCode: 'INVALID_STATE',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    expect(router.url).toBe('/session/K7P2QX9M');
  });
});

describe('StartPage recent sessions', () => {
  let fixture: ComponentFixture<StartPage>;
  let http: HttpTestingController;
  let recent: RecentSessions;
  let errorState: ErrorState;

  const NOW = Date.parse('2026-11-18T10:00:00.000Z');

  function entry(sessionId: string, changes: Partial<RecentSession> = {}): RecentSession {
    return {
      sessionId,
      participantId: `p-${sessionId}`,
      token: `token-${sessionId}`,
      role: 'SCRUM_MASTER',
      name: 'Anna',
      lastUsedAt: new Date(NOW - 5 * 60_000).toISOString(),
      ...changes,
    };
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'session/:id', component: EmptyPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    recent = TestBed.inject(RecentSessions);
    errorState = TestBed.inject(ErrorState);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  async function openPage(enabled: boolean | null, entries: RecentSession[]): Promise<void> {
    recent.enabled.set(enabled);
    entries
      .slice()
      .reverse()
      .forEach((e) => recent.save(e));
    fixture = TestBed.createComponent(StartPage);
    fixture.autoDetectChanges();
    http.expectOne('/api/health').flush({ status: 'UP' });
    await fixture.whenStable();
  }

  function rows(): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-testid="recent-session"]',
      ),
    );
  }

  function field(row: HTMLElement, id: string): string {
    return (row.querySelector(`[data-testid="${id}"]`)?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function section(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="recent-sessions"]');
  }

  function fail(sessionId: string, code: string, status: number): void {
    http
      .expectOne(`/api/sessions/${sessionId}`)
      .flush(
        { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
        { status, statusText: 'Error' },
      );
  }

  it('shows the checked entries with project, issue, role, name, session id and time', async () => {
    await openPage(true, [
      entry('K7P2QX9M'),
      entry('M3N4P5Q6', {
        role: 'DEVELOPER',
        name: 'Ben',
        lastUsedAt: new Date(NOW - 3 * 3_600_000).toISOString(),
      }),
    ]);
    http.expectOne('/api/sessions/K7P2QX9M').flush(lobbyScrumMaster);
    http
      .expectOne('/api/sessions/M3N4P5Q6')
      .flush({ ...discussionDeveloper, sessionId: 'M3N4P5Q6' });
    await fixture.whenStable();

    expect(section()?.querySelector('h2')?.textContent?.trim()).toBe('Letzte Sitzungen');
    const [first, second] = rows();
    expect(rows()).toHaveLength(2);
    expect(field(first, 'recent-session-project')).toBe('Frontend');
    expect(field(first, 'recent-session-issue')).toBe('Kein Issue aktiv');
    expect(field(first, 'recent-session-role')).toBe('Scrum Master');
    expect(field(first, 'recent-session-name')).toBe('Anna');
    expect(field(first, 'recent-session-id')).toBe('K7P2QX9M');
    expect(field(first, 'recent-session-last-used')).toBe('zuletzt vor 5 Minuten');
    expect(field(second, 'recent-session-issue')).toBe('#42 Login page');
    expect(field(second, 'recent-session-role')).toBe('Entwickler');
    expect(field(second, 'recent-session-last-used')).toBe('zuletzt vor 3 Stunden');
    expect(first.querySelector('a')?.getAttribute('href')).toBe('/session/K7P2QX9M');
  });

  it('shows a stored viewer as Zuschauer', async () => {
    const viewerView = {
      ...discussionDeveloper,
      me: { ...discussionDeveloper.me, role: 'VIEWER' as const },
    };
    await openPage(true, [entry('K7P2QX9M', { role: 'VIEWER', name: 'Paula' })]);
    http.expectOne('/api/sessions/K7P2QX9M').flush(viewerView);
    await fixture.whenStable();

    expect(recent.list()[0].role).toBe('VIEWER');
    expect(field(rows()[0], 'recent-session-role')).toBe('Zuschauer');
  });

  it('shows the role of the snapshot when the stored role differs', async () => {
    await openPage(true, [entry('K7P2QX9M', { role: 'DEVELOPER', name: 'Paula' })]);
    http.expectOne('/api/sessions/K7P2QX9M').flush({
      ...discussionDeveloper,
      me: { ...discussionDeveloper.me, role: 'VIEWER' as const },
    });
    await fixture.whenStable();

    expect(field(rows()[0], 'recent-session-role')).toBe('Zuschauer');
  });

  it('checks each entry with its own token', async () => {
    await openPage(true, [entry('K7P2QX9M')]);
    const request = http.expectOne('/api/sessions/K7P2QX9M');

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-K7P2QX9M');
    request.flush(lobbyScrumMaster);
  });

  it.each([
    ['SESSION_NOT_FOUND', 404],
    ['UNAUTHORIZED', 401],
  ])('removes an entry that answers %s without a banner', async (code, status) => {
    await openPage(true, [entry('K7P2QX9M'), entry('M3N4P5Q6')]);
    fail('K7P2QX9M', code, status);
    http.expectOne('/api/sessions/M3N4P5Q6').flush({ ...lobbyScrumMaster, sessionId: 'M3N4P5Q6' });
    await fixture.whenStable();

    expect(rows().map((row) => field(row, 'recent-session-id'))).toEqual(['M3N4P5Q6']);
    expect(recent.list().map((e) => e.sessionId)).toEqual(['M3N4P5Q6']);
    expect(errorState.error()).toBeNull();
  });

  it('keeps an entry on another error and shows it without details', async () => {
    await openPage(true, [entry('K7P2QX9M')]);
    fail('K7P2QX9M', 'GITLAB_ERROR', 502);
    await fixture.whenStable();

    expect(rows()).toHaveLength(1);
    expect(rows()[0].querySelector('[data-testid="recent-session-project"]')).toBeNull();
    expect(field(rows()[0], 'recent-session-id')).toBe('K7P2QX9M');
    expect(recent.list()).toHaveLength(1);
    expect(errorState.error()).toBeNull();
  });

  it('removes an entry from the list with Aus Liste entfernen', async () => {
    await openPage(true, [entry('K7P2QX9M'), entry('M3N4P5Q6')]);
    http.expectOne('/api/sessions/K7P2QX9M').flush(lobbyScrumMaster);
    http.expectOne('/api/sessions/M3N4P5Q6').flush({ ...lobbyScrumMaster, sessionId: 'M3N4P5Q6' });
    await fixture.whenStable();

    const remove = rows()[0].querySelector<HTMLButtonElement>(
      '[data-testid="recent-session-remove"]',
    );
    expect(remove?.textContent?.trim()).toBe('Aus Liste entfernen');
    remove?.click();
    await fixture.whenStable();

    expect(rows().map((row) => field(row, 'recent-session-id'))).toEqual(['M3N4P5Q6']);
    expect(recent.list().map((e) => e.sessionId)).toEqual(['M3N4P5Q6']);
  });

  it('shows no section and clears the list when the feature is off', async () => {
    await openPage(false, [entry('K7P2QX9M')]);
    http.expectNone('/api/sessions/K7P2QX9M');

    expect(section()).toBeNull();
    expect(localStorage.getItem(RECENT_SESSIONS_KEY)).toBeNull();
  });

  it('shows no section without entries', async () => {
    await openPage(true, []);

    expect(section()).toBeNull();
  });

  it('shows no section and keeps the list while the setting is unknown', async () => {
    await openPage(null, [entry('K7P2QX9M')]);
    http.expectNone('/api/sessions/K7P2QX9M');

    expect(section()).toBeNull();
    expect(recent.list()).toHaveLength(1);
  });
});
