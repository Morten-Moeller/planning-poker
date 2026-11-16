import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '../api/api-error';
import { ErrorState } from '../api/error-state';
import { ErrorBanner } from './error-banner';

const DETAIL = 'Internal detail text of the API.';

const texts: [string, string][] = [
  ['VALIDATION_ERROR', 'Die Eingabe ist ungültig.'],
  ['INVALID_CARD', 'Diese Karte gibt es nicht.'],
  ['UNAUTHORIZED', 'Der Zugang zur Sitzung ist nicht mehr gültig.'],
  ['FORBIDDEN_ROLE', 'Diese Aktion ist für Ihre Rolle nicht erlaubt.'],
  ['SESSION_NOT_FOUND', 'Die Sitzung wurde nicht gefunden.'],
  ['ISSUE_NOT_FOUND', 'Das Issue wurde nicht gefunden.'],
  ['NAME_TAKEN', 'Der Name ist in dieser Sitzung schon vergeben.'],
  ['INVALID_STATE', 'Die Aktion passt nicht zum aktuellen Stand der Sitzung.'],
  ['NOT_IMPLEMENTED', 'Diese Funktion steht noch nicht bereit.'],
  ['GITLAB_ERROR', 'GitLab hat nicht geantwortet.'],
  ['SOMETHING_NEW', 'Es ist ein Fehler aufgetreten.'],
];

describe('ErrorBanner', () => {
  let fixture: ComponentFixture<ErrorBanner>;
  let errorState: ErrorState;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ErrorBanner);
    errorState = TestBed.inject(ErrorState);
    await fixture.whenStable();
  });

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  it('shows nothing without an error', () => {
    expect(element('error-banner')).toBeNull();
  });

  it.each(texts)('shows the German text for %s and never the detail', async (code, text) => {
    errorState.report(new ApiError(code, 409, DETAIL));
    await fixture.whenStable();

    expect(element('error-message')?.textContent).toBe(text);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(DETAIL);
  });

  it('hides the banner when the user closes it', async () => {
    errorState.report(new ApiError('NAME_TAKEN', 409, DETAIL));
    await fixture.whenStable();

    element('error-close')?.click();
    await fixture.whenStable();

    expect(element('error-banner')).toBeNull();
    expect(errorState.error()).toBeNull();
  });
});
