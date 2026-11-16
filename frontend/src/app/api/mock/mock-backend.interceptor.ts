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
  JoinSessionResponse,
} from '../api.service';
import { MOCK_SESSION_ID, issueToken, roleOfToken, snapshotFor } from './mock-session';

const MOCK_MISSING_ISSUE_IID = 404;
const MOCK_TAKEN_NAME = 'Ben';
const SESSION_PATH = /^\/api\/sessions\/([^/?]+)(\/[^?]*)?/;

export const mockBackendInterceptor: HttpInterceptorFn = (request) => answer(request);

function answer(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const path = request.url.split('?')[0];
  if (path === '/api/health') {
    return ok({ status: 'UP' });
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
