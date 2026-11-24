import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import type { ErrorCode } from './api-error';
import { errorMessage, formErrorMessage } from './error-messages';

const TEXTS: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Die Eingabe ist ungültig.',
  INVALID_CARD: 'Diese Karte gibt es nicht.',
  UNAUTHORIZED: 'Der Zugang zur Sitzung ist nicht mehr gültig.',
  FORBIDDEN_ROLE: 'Diese Aktion ist für Ihre Rolle nicht erlaubt.',
  INVITE_INVALID: 'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
  PROJECT_NOT_ALLOWED: 'Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.',
  SESSION_NOT_FOUND: 'Die Sitzung wurde nicht gefunden oder ist abgelaufen.',
  ISSUE_NOT_FOUND: 'Das Issue wurde im GitLab-Projekt nicht gefunden.',
  PROJECT_NOT_FOUND: 'Das GitLab-Projekt wurde nicht gefunden.',
  NAME_TAKEN: 'Der Name ist in dieser Sitzung schon vergeben.',
  INVALID_STATE: 'Die Aktion passt nicht zum aktuellen Stand der Sitzung.',
  LIMIT_REACHED: 'Die Höchstzahl ist erreicht. Bitte später erneut versuchen.',
  GITLAB_ACCESS_DENIED:
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  GITLAB_ERROR: 'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
};

const UNKNOWN = 'Es ist ein Fehler aufgetreten.';

describe('errorMessage', () => {
  it('has a text for each of the 14 error codes', () => {
    expect(Object.keys(TEXTS)).toHaveLength(14);
  });

  it.each(Object.entries(TEXTS))('gives the German text for %s', (code, text) => {
    expect(errorMessage(code)).toBe(text);
  });

  it.each(['SOMETHING_NEW', '', 'toString', 'constructor'])(
    'gives the general text for the unknown code "%s"',
    (code) => {
      expect(errorMessage(code)).toBe(UNKNOWN);
    },
  );
});

describe('formErrorMessage', () => {
  const codes: ReadonlySet<ErrorCode> = new Set<ErrorCode>(['NAME_TAKEN', 'INVITE_INVALID']);

  it('gives the text for an ApiError with a code of the set', () => {
    expect(formErrorMessage(new ApiError('NAME_TAKEN', 409, 'detail'), codes)).toBe(
      'Der Name ist in dieser Sitzung schon vergeben.',
    );
  });

  it.each([
    { name: 'an ApiError with a code outside the set', error: new ApiError('GITLAB_ERROR', 502) },
    { name: 'an ApiError with an unknown code', error: new ApiError('SOMETHING_NEW', 500) },
    { name: 'an error that is no ApiError', error: new Error('NAME_TAKEN') },
    { name: 'an object with an errorCode', error: { errorCode: 'NAME_TAKEN' } },
    { name: 'null', error: null },
  ])('gives null for $name', ({ error }) => {
    expect(formErrorMessage(error, codes)).toBeNull();
  });

  it('gives null for every code with an empty set', () => {
    expect(formErrorMessage(new ApiError('NAME_TAKEN', 409), new Set())).toBeNull();
  });
});
