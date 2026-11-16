import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
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
  ['GITLAB_ERROR', 502, 'GitLab hat nicht geantwortet.'],
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
