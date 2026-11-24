import { t } from '../i18n/messages';
import type { MessageKey } from '../i18n/messages';
import { ApiError } from './api-error';
import type { ErrorCode } from './api-error';

const TEXT_BY_CODE: Record<ErrorCode, MessageKey> = {
  VALIDATION_ERROR: 'error.VALIDATION_ERROR',
  INVALID_CARD: 'error.INVALID_CARD',
  UNAUTHORIZED: 'error.UNAUTHORIZED',
  FORBIDDEN_ROLE: 'error.FORBIDDEN_ROLE',
  INVITE_INVALID: 'error.INVITE_INVALID',
  PROJECT_NOT_ALLOWED: 'error.PROJECT_NOT_ALLOWED',
  SESSION_NOT_FOUND: 'error.SESSION_NOT_FOUND',
  ISSUE_NOT_FOUND: 'error.ISSUE_NOT_FOUND',
  PROJECT_NOT_FOUND: 'error.PROJECT_NOT_FOUND',
  NAME_TAKEN: 'error.NAME_TAKEN',
  INVALID_STATE: 'error.INVALID_STATE',
  LIMIT_REACHED: 'error.LIMIT_REACHED',
  GITLAB_ACCESS_DENIED: 'error.GITLAB_ACCESS_DENIED',
  GITLAB_ERROR: 'error.GITLAB_ERROR',
};

function isKnownCode(code: string): code is ErrorCode {
  return Object.hasOwn(TEXT_BY_CODE, code);
}

export function errorMessage(errorCode: string): string {
  return t(isKnownCode(errorCode) ? TEXT_BY_CODE[errorCode] : 'error.unknown');
}

export function formErrorMessage(error: unknown, codes: ReadonlySet<ErrorCode>): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  return isKnownCode(error.errorCode) && codes.has(error.errorCode)
    ? t(TEXT_BY_CODE[error.errorCode])
    : null;
}
