import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';
import { ApiService } from './api.service';
import { authInterceptor } from './auth.interceptor';
import { ErrorState } from './error-state';
import { TokenStore } from './token-store';

const SESSION_ID = 'K7P2QX9M';
const TOKEN = 'token-anna';
const BASE = `/api/sessions/${SESSION_ID}`;

interface Call {
  name: string;
  call: (api: ApiService) => Observable<unknown>;
  method: string;
  url: string;
  body: unknown;
  authenticated: boolean;
}

const calls: Call[] = [
  {
    name: 'createSession',
    call: (api) => api.createSession({ name: 'Anna', gitlabProjectId: '1234', issueIid: 42 }),
    method: 'POST',
    url: '/api/sessions',
    body: { name: 'Anna', gitlabProjectId: '1234', issueIid: 42 },
    authenticated: false,
  },
  {
    name: 'joinSession',
    call: (api) => api.joinSession(SESSION_ID, { name: 'Ben' }),
    method: 'POST',
    url: `${BASE}/participants`,
    body: { name: 'Ben' },
    authenticated: false,
  },
  {
    name: 'getSession',
    call: (api) => api.getSession(SESSION_ID),
    method: 'GET',
    url: BASE,
    body: null,
    authenticated: true,
  },
  {
    name: 'listIssues',
    call: (api) => api.listIssues(SESSION_ID, { search: 'login', page: 2 }),
    method: 'GET',
    url: `${BASE}/issues?search=login&page=2`,
    body: null,
    authenticated: true,
  },
  {
    name: 'selectIssue',
    call: (api) => api.selectIssue(SESSION_ID, { issueIid: 42 }),
    method: 'POST',
    url: `${BASE}/active-issue`,
    body: { issueIid: 42 },
    authenticated: true,
  },
  {
    name: 'vote',
    call: (api) => api.vote(SESSION_ID, { card: '5' }),
    method: 'PUT',
    url: `${BASE}/vote`,
    body: { card: '5' },
    authenticated: true,
  },
  {
    name: 'revealRound',
    call: (api) => api.revealRound(SESSION_ID),
    method: 'POST',
    url: `${BASE}/round/reveal`,
    body: null,
    authenticated: true,
  },
  {
    name: 'restartRound',
    call: (api) => api.restartRound(SESSION_ID),
    method: 'POST',
    url: `${BASE}/round/restart`,
    body: null,
    authenticated: true,
  },
  {
    name: 'confirmRound',
    call: (api) => api.confirmRound(SESSION_ID, { card: '8' }),
    method: 'POST',
    url: `${BASE}/round/confirm`,
    body: { card: '8' },
    authenticated: true,
  },
];

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStore).store(SESSION_ID, { participantId: 'p-anna', token: TOKEN });
  });

  afterEach(() => http.verify());

  it.each(calls)('$name calls $method $url', ({ call, method, url, body, authenticated }) => {
    call(api).subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe(method);
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe(
      authenticated ? `Bearer ${TOKEN}` : null,
    );
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('sends no Authorization header without a stored token for the session', () => {
    api.getSession('M3N4P5Q6').subscribe({ error: () => undefined });

    const request = http.expectOne('/api/sessions/M3N4P5Q6');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('turns a problem detail response into an ApiError and reports it', () => {
    let failure: unknown;
    api.vote(SESSION_ID, { card: '5' }).subscribe({ error: (error: unknown) => (failure = error) });

    http.expectOne(`${BASE}/vote`).flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'The round is already revealed.',
        errorCode: 'INVALID_STATE',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(failure).toBeInstanceOf(ApiError);
    const apiError = failure as ApiError;
    expect(apiError.errorCode).toBe('INVALID_STATE');
    expect(apiError.status).toBe(409);
    expect(TestBed.inject(ErrorState).error()).toBe(apiError);
  });

  it('passes a response without problem detail through unchanged', () => {
    let failure: unknown;
    api.getSession(SESSION_ID).subscribe({ error: (error: unknown) => (failure = error) });

    http.expectOne(BASE).flush('gateway down', { status: 503, statusText: 'Service Unavailable' });

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(TestBed.inject(ErrorState).error()).toBeNull();
  });
});
