import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { ErrorCode, ProblemDetail } from '../api-error';
import { lobbyScrumMaster } from '../examples';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  IssueListResponse,
  JoinSessionRequest,
  IssueSummary,
  JoinSessionResponse,
  ProjectListResponse,
  ProjectSummary,
} from '../api.service';
import { MOCK_SESSION_ID, issueToken, roleOfToken, snapshotFor } from './mock-session';

const MOCK_MISSING_ISSUE_IID = 404;
const MOCK_TAKEN_NAME = 'Ben';
const SESSION_PATH = /^\/api\/sessions\/([^/?]+)(\/[^?]*)?/;
const PROJECT_ISSUES_PATH = /^\/api\/projects\/[^/?]+\/issues$/;
const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: 1234,
    name: 'Planning Poker',
    pathWithNamespace: 'group/planning-poker',
    webUrl: 'https://gitlab.com/group/planning-poker',
  },
  {
    id: 5678,
    name: 'Poker Tools',
    pathWithNamespace: 'group/poker-tools',
    webUrl: 'https://gitlab.com/group/poker-tools',
  },
  {
    id: 9012,
    name: 'Release Notes',
    pathWithNamespace: 'group/release-notes',
    webUrl: 'https://gitlab.com/group/release-notes',
  },
];
const MOCK_ISSUES: IssueSummary[] = [
  { iid: 42, title: 'Login page', webUrl: 'https://gitlab.com/group/project/-/issues/42' },
  { iid: 43, title: 'Password reset', webUrl: 'https://gitlab.com/group/project/-/issues/43' },
];

export const mockBackendInterceptor: HttpInterceptorFn = (request) => answer(request);

function answer(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const path = request.url.split('?')[0];
  if (path === '/api/health') {
    return ok({ status: 'UP' });
  }
  if (path === '/api/projects') {
    const search = searchText(request);
    const projects: ProjectListResponse = {
      items: MOCK_PROJECTS.filter(
        (project) =>
          project.name.toLowerCase().includes(search) ||
          project.pathWithNamespace.toLowerCase().includes(search),
      ),
      nextPage: null,
    };
    return ok(projects);
  }
  if (PROJECT_ISSUES_PATH.test(path)) {
    const search = searchText(request);
    const issues: IssueListResponse = {
      items: MOCK_ISSUES.filter((issue) => issue.title.toLowerCase().includes(search)),
      nextPage: null,
    };
    return ok(issues);
  }
  if (path === '/api/sessions' && request.method === 'POST') {
    if ((request.body as CreateSessionRequest | null)?.issueIid === MOCK_MISSING_ISSUE_IID) {
      return problem(404, 'Not Found', 'ISSUE_NOT_FOUND', 'Unknown issue.');
    }
    const created: CreateSessionResponse = {
      sessionId: MOCK_SESSION_ID,
      participantId: lobbyScrumMaster.me.participantId,
      token: issueToken('SCRUM_MASTER'),
    };
    return ok(created, 201);
  }
  const match = SESSION_PATH.exec(path);
  if (match === null) {
    return problem(404, 'Not Found', 'SESSION_NOT_FOUND', 'Unknown path.');
  }
  if (decodeURIComponent(match[1]) !== MOCK_SESSION_ID) {
    return problem(404, 'Not Found', 'SESSION_NOT_FOUND', 'Unknown session.');
  }
  const subPath = match[2] ?? '';
  if (subPath === '/participants' && request.method === 'POST') {
    const name = (request.body as JoinSessionRequest | null)?.name?.trim().toLowerCase();
    if (name === MOCK_TAKEN_NAME.toLowerCase()) {
      return problem(409, 'Conflict', 'NAME_TAKEN', 'The name is already taken.');
    }
    const joined: JoinSessionResponse = {
      participantId: snapshotFor('DEVELOPER').me.participantId,
      token: issueToken('DEVELOPER'),
    };
    return ok(joined, 201);
  }
  const role = roleOfToken(bearerToken(request));
  if (role === null) {
    return problem(401, 'Unauthorized', 'UNAUTHORIZED', 'Unknown token.');
  }
  if (subPath === '') {
    return ok(snapshotFor(role));
  }
  if (subPath === '/issues') {
    const issues: IssueListResponse = {
      items: [
        {
          iid: 42,
          title: 'Login page',
          webUrl: 'https://gitlab.com/group/project/-/issues/42',
        },
      ],
      nextPage: null,
    };
    return ok(issues);
  }
  return of(new HttpResponse<void>({ status: 204 }));
}

function searchText(request: HttpRequest<unknown>): string {
  return (request.params.get('search') ?? '').trim().toLowerCase();
}

function bearerToken(request: HttpRequest<unknown>): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse({ status, body }));
}

function problem(
  status: number,
  title: string,
  errorCode: ErrorCode,
  detail: string,
): Observable<never> {
  const body: ProblemDetail = { type: 'about:blank', title, status, detail, errorCode };
  return throwError(
    () =>
      new HttpErrorResponse({
        status,
        statusText: title,
        error: body,
        headers: new HttpHeaders({ 'Content-Type': 'application/problem+json' }),
      }),
  );
}
