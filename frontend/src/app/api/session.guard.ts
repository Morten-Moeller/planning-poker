import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from './token-store';

export const sessionGuard: CanActivateFn = (route) => {
  const sessionId = route.paramMap.get('id') ?? '';
  if (inject(TokenStore).identity(sessionId) !== null) {
    return true;
  }
  return inject(Router).createUrlTree(['/session', sessionId, 'join']);
};
