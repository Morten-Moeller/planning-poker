import { ApiError, type ErrorCode } from './api-error';

function messagesByCode(): Record<ErrorCode, string> {
  return {
    VALIDATION_ERROR: $localize`:@@error.VALIDATION_ERROR:Die Eingabe ist ungültig.`,
    INVALID_CARD: $localize`:@@error.INVALID_CARD:Diese Karte gibt es nicht.`,
    UNAUTHORIZED: $localize`:@@error.UNAUTHORIZED:Der Zugang zur Sitzung ist nicht mehr gültig.`,
    FORBIDDEN_ROLE: $localize`:@@error.FORBIDDEN_ROLE:Diese Aktion ist für Ihre Rolle nicht erlaubt.`,
    SESSION_NOT_FOUND: $localize`:@@error.SESSION_NOT_FOUND:Die Sitzung wurde nicht gefunden oder ist abgelaufen.`,
    ISSUE_NOT_FOUND: $localize`:@@error.ISSUE_NOT_FOUND:Das Issue wurde im GitLab-Projekt nicht gefunden.`,
    NAME_TAKEN: $localize`:@@error.NAME_TAKEN:Der Name ist in dieser Sitzung schon vergeben.`,
    INVALID_STATE: $localize`:@@error.INVALID_STATE:Die Aktion passt nicht zum aktuellen Stand der Sitzung.`,
    NOT_IMPLEMENTED: $localize`:@@error.NOT_IMPLEMENTED:Diese Funktion steht noch nicht bereit.`,
    GITLAB_ERROR: $localize`:@@error.GITLAB_ERROR:GitLab hat nicht geantwortet.`,
  };
}

function isKnownCode(code: string, messages: Record<ErrorCode, string>): code is ErrorCode {
  return Object.hasOwn(messages, code);
}

export function errorMessage(errorCode: string): string {
  const messages = messagesByCode();
  return isKnownCode(errorCode, messages)
    ? messages[errorCode]
    : $localize`:@@error.unknown:Es ist ein Fehler aufgetreten.`;
}

export function formErrorMessage(error: unknown, codes: ReadonlySet<ErrorCode>): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  const messages = messagesByCode();
  return isKnownCode(error.errorCode, messages) && codes.has(error.errorCode)
    ? messages[error.errorCode]
    : null;
}
