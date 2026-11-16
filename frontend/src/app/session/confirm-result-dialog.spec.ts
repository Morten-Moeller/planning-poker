import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { ErrorState } from '../api/error-state';
import { TokenStore } from '../api/token-store';
import { CARDS } from './cards';
import { ConfirmResultData, ConfirmResultDialog } from './confirm-result-dialog';

const SESSION_ID = 'K7P2QX9M';
const CONFIRM_URL = `/api/sessions/${SESSION_ID}/round/confirm`;

describe('ConfirmResultDialog', () => {
  let http: HttpTestingController;
  let dialogRef: MatDialogRef<ConfirmResultDialog, boolean>;
  let closedWith: boolean | undefined | null;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStore).store(SESSION_ID, { participantId: 'p-anna', token: 'token' });
    closedWith = null;
    dialogRef = TestBed.inject(MatDialog).open<ConfirmResultDialog, ConfirmResultData, boolean>(
      ConfirmResultDialog,
      { data: { sessionId: SESSION_ID } },
    );
    dialogRef.afterClosed().subscribe((result) => (closedWith = result));
    await stable();
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
    http.verify();
  });

  async function stable(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function all(id: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));
  }

  function text(id: string): string {
    return all(id)[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function submit(): HTMLButtonElement {
    return all('confirm-submit')[0] as HTMLButtonElement;
  }

  function radio(index: number): HTMLInputElement {
    return all('confirm-card')[index].querySelector('input') as HTMLInputElement;
  }

  async function choose(card: string): Promise<void> {
    radio(CARDS.indexOf(card as (typeof CARDS)[number])).click();
    await stable();
  }

  async function send(): Promise<void> {
    submit().click();
    await stable();
  }

  function problem(code: string, status: number) {
    return [
      { type: 'about:blank', title: 'Error', status, detail: 'detail', errorCode: code },
      { status, statusText: 'Error' },
    ] as const;
  }

  it('offers exactly the 11 cards of the deck', () => {
    const cards = all('confirm-card');

    expect(cards).toHaveLength(11);
    expect(cards.map((card) => card.querySelector('input')!.value)).toEqual([...CARDS]);
    expect(radio(10).getAttribute('aria-label')).toBe('Kaffeepause');
    expect(radio(5).getAttribute('aria-label')).toBe('8');
  });

  it('enables the submit button only after a card is chosen', async () => {
    expect(submit().disabled).toBe(true);
    expect(text('confirm-submit')).toBe('Übernehmen');

    await choose('8');

    expect(submit().disabled).toBe(false);
  });

  it('confirms the chosen card, closes the dialog and shows the success message', async () => {
    await choose('8');
    await send();

    const request = http.expectOne(CONFIRM_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ card: '8' });
    expect(submit().disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await stable();

    expect(closedWith).toBe(true);
    expect(all('confirm-dialog')).toHaveLength(0);
    expect(text('confirm-success')).toBe('Das Ergebnis wurde in GitLab übernommen.');
  });

  it('shows a GitLab error in the dialog, keeps the card, clears the banner and retries', async () => {
    await choose('COFFEE');
    await send();

    http.expectOne(CONFIRM_URL).flush(...problem('GITLAB_ERROR', 502));
    await stable();

    expect(text('confirm-error')).toBe('GitLab hat nicht geantwortet.');
    expect(all('confirm-error')[0].getAttribute('role')).toBe('alert');
    expect(TestBed.inject(ErrorState).error()).toBeNull();
    expect(all('confirm-dialog')).toHaveLength(1);
    expect(closedWith).toBeNull();
    expect(radio(10).checked).toBe(true);
    expect(text('confirm-submit')).toBe('Erneut versuchen');
    expect(submit().disabled).toBe(false);

    await send();

    const retry = http.expectOne(CONFIRM_URL);
    expect(retry.request.body).toEqual({ card: 'COFFEE' });
    retry.flush(null, { status: 204, statusText: 'No Content' });
    await stable();

    expect(closedWith).toBe(true);
    expect(text('confirm-success')).toBe('Das Ergebnis wurde in GitLab übernommen.');
  });

  it('leaves other errors to the banner', async () => {
    await choose('5');
    await send();

    http.expectOne(CONFIRM_URL).flush(...problem('INVALID_STATE', 409));
    await stable();

    expect(all('confirm-error')).toHaveLength(0);
    expect(TestBed.inject(ErrorState).error()?.errorCode).toBe('INVALID_STATE');
    expect(text('confirm-submit')).toBe('Übernehmen');
  });

  it('selects the suggested card and enables the submit button', async () => {
    TestBed.inject(MatDialog).closeAll();
    await stable();
    TestBed.inject(MatDialog).open<ConfirmResultDialog, ConfirmResultData, boolean>(
      ConfirmResultDialog,
      { data: { sessionId: SESSION_ID, suggestedCard: '8' } },
    );
    await stable();

    expect(radio(5).checked).toBe(true);
    expect(all('confirm-card').filter((card) => card.querySelector('input')!.checked)).toHaveLength(
      1,
    );
    expect(submit().disabled).toBe(false);

    await choose('13');
    await send();

    const request = http.expectOne(CONFIRM_URL);
    expect(request.request.body).toEqual({ card: '13' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await stable();
  });

  it('selects no card without a suggested card', () => {
    expect(all('confirm-card').filter((card) => card.querySelector('input')!.checked)).toHaveLength(
      0,
    );
    expect(submit().disabled).toBe(true);
  });
});
