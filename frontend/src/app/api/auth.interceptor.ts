import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStore } from './token-store';

const SESSION_PATH = /^\/api\/sessions\/([^/?]+)(\/[^?]*)?/;

export function sessionIdOfAuthenticatedCall(method: string, url: string): string | null {
  const match = SESSION_PATH.exec(url);
  if (match === null) {
    return null;
  }
  const isJoin = method === 'POST' && match[2] === '/participants';
  return isJoin ? null : decodeURIComponent(match[1]);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionId = sessionIdOfAuthenticatedCall(request.method, request.url);
  const identity = sessionId === null ? null : inject(TokenStore).identity(sessionId);
  if (identity === null) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${identity.token}` } }));
};
