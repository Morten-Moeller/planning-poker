import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError, isProblemDetail } from './api-error';
import { ErrorState } from './error-state';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errorState = inject(ErrorState);
  return next(request).pipe(
    catchError((response: unknown) => {
      if (response instanceof HttpErrorResponse && isProblemDetail(response.error)) {
        const error = new ApiError(
          response.error.errorCode,
          response.status,
          response.error.detail,
        );
        errorState.report(error);
        return throwError(() => error);
      }
      return throwError(() => response);
    }),
  );
};
