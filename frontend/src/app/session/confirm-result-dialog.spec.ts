import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { ErrorState } from '../api/error-state';
import { revealedScrumMaster, SessionView } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { CARDS, Card } from './cards';
import { ConfirmResultData, ConfirmResultDialog } from './confirm-result-dialog';

const SESSION_ID = 'K7P2QX9M';
const CONFIRM_URL = `/api/sessions/${SESSION_ID}/round/confirm`;

describe('ConfirmResultDialog', () => {
  let http: HttpTestingController;
  let store: SessionStore;
  let closedWith: boolean | undefined | null;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    closedWith = null;
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    store.leave();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
    http.verify();
  });

  async function open(
    suggestedCard: Card | null = null,
    snapshot: SessionView = revealedScrumMaster,
  ): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    TestBed.inject(MatDialog)
      .open<ConfirmResultDialog, ConfirmResultData, boolean>(ConfirmResultDialog, {
        data: { sessionId: SESSION_ID, suggestedCard },
      })
      .afterClosed()
      .subscribe((result) => (closedWith = result));
    await stable();
  }

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

  function option(card: Card): HTMLElement {
    return all('confirm-card')[CARDS.indexOf(card)];
  }

  function description(card: Card): string | null {
    const id = option(card).querySelector('input')!.getAttribute('aria-describedby');
    return id === null
      ? null
      : (document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? null);
  }

  async function choose(card: Card): Promise<void> {
    radio(CARDS.indexOf(card)).click();
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

  it('offers exactly the 11 cards of the deck', async () => {
    await open();
    const cards = all('confirm-card');

    expect(cards).toHaveLength(11);
    expect(cards.map((card) => card.querySelector('input')!.value)).toEqual([...CARDS]);
    expect(radio(10).getAttribute('aria-label')).toBe('Kaffeepause');
    expect(radio(5).getAttribute('aria-label')).toBe('8');
  });

  it('names the issue and shows the votes per card with the most frequent values marked', async () => {
    await open();

    expect(text('confirm-lead')).toBe(
      'Endwert für #42 Login page. Kein Konsens, deshalb ist nichts vorausgewählt.',
    );
    expect(option('5').textContent).toContain('1×');
    expect(option('8').textContent).toContain('1×');
    expect(option('3').textContent).not.toContain('×');
    expect(option('5').classList).toContain('most-frequent');
    expect(option('8').classList).toContain('most-frequent');
    expect(option('3').classList).not.toContain('most-frequent');
    expect(description('5')).toBe('1 Stimme, häufigster Wert');
    expect(description('3')).toBeNull();
    expect(text('confirm-legend')).toBe(
      'Häufigster Wert dieser Runde, darunter die Anzahl der Stimmen. Nur zur Orientierung.',
    );
  });

  it('preselects the consensus and marks no most frequent value', async () => {
    await open('5', {
      ...revealedScrumMaster,
      round: {
        ...revealedScrumMaster.round!,
        stats: { distribution: [{ card: '5', count: 2 }], average: 5, mostFrequent: ['5'] },
      },
    });

    expect(text('confirm-lead')).toBe('Endwert für #42 Login page. Konsens: 5 ist vorausgewählt.');
    expect(radio(4).checked).toBe(true);
    expect(option('5').classList).toContain('selected');
    expect(option('5').classList).not.toContain('most-frequent');
    expect(option('5').textContent).toContain('2×');
    expect(description('5')).toBe('2 Stimmen');
    expect(all('confirm-legend')).toHaveLength(0);
    expect(submit().disabled).toBe(false);
  });

  it.each([
    [false, 'Das Gewicht des Issues bleibt unverändert.'],
    [true, 'Zahlenwerte werden zusätzlich als Gewicht gesetzt.'],
  ])('names the comment and the weight with writeWeight %s', async (writeWeight, sentence) => {
    await open(null, { ...revealedScrumMaster, writeWeight });

    expect(text('confirm-note')).toBe(
      `ⓘIns GitLab-Issue #42 wird ein Kommentar mit dem Endwert geschrieben. ${sentence}`,
    );
  });

  it('enables the submit button only after a card is chosen', async () => {
    await open();
    expect(submit().disabled).toBe(true);
    expect(text('confirm-submit')).toBe('Übernehmen');

    await choose('8');

    expect(submit().disabled).toBe(false);
  });

  it('shows the writing state, closes the dialog and shows the success message', async () => {
    await open();
    await choose('8');
    await send();

    const request = http.expectOne(CONFIRM_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ card: '8' });
    expect(submit().disabled).toBe(true);
    expect(text('confirm-submit')).toBe('Wird übernommen …');
    expect(text('confirm-writing')).toBe('Das Ergebnis wird nach GitLab geschrieben …');
    expect(radio(5).disabled).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await stable();

    expect(closedWith).toBe(true);
    expect(all('confirm-dialog')).toHaveLength(0);
    expect(text('confirm-success')).toBe('✓ Endwert 8 in GitLab-Issue #42 gespeichert.');
  });

  it('shows the access denied text of GitLab in the dialog and clears the banner', async () => {
    await open();
    await choose('COFFEE');
    await send();

    http.expectOne(CONFIRM_URL).flush(...problem('GITLAB_ACCESS_DENIED', 502));
    await stable();

    expect(text('confirm-error-message')).toBe(
      'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
    );
    expect(text('confirm-error')).toContain(
      'Der Kommentar wurde nicht geschrieben. Prüfe das Token und versuche es erneut.',
    );
    expect(TestBed.inject(ErrorState).error()).toBeNull();
    expect(all('confirm-dialog')).toHaveLength(1);
    expect(closedWith).toBeNull();
  });

  it('shows a GitLab error in the dialog, keeps the card, clears the banner and retries', async () => {
    await open();
    await choose('COFFEE');
    await send();

    http.expectOne(CONFIRM_URL).flush(...problem('GITLAB_ERROR', 502));
    await stable();

    expect(text('confirm-error')).toBe(
      '⚠GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen. Der Kommentar wurde nicht geschrieben. Prüfe das Token und versuche es erneut.',
    );
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
    expect(text('confirm-success')).toBe('✓ Endwert Kaffeepause in GitLab-Issue #42 gespeichert.');
  });

  it('leaves other errors to the banner', async () => {
    await open();
    await choose('5');
    await send();

    http.expectOne(CONFIRM_URL).flush(...problem('INVALID_STATE', 409));
    await stable();

    expect(all('confirm-error')).toHaveLength(0);
    expect(TestBed.inject(ErrorState).error()?.errorCode).toBe('INVALID_STATE');
    expect(text('confirm-submit')).toBe('Übernehmen');
  });

  it('selects the suggested card and sends another chosen card', async () => {
    await open('8');

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

  it('selects no card without a suggested card', async () => {
    await open();

    expect(all('confirm-card').filter((card) => card.querySelector('input')!.checked)).toHaveLength(
      0,
    );
    expect(submit().disabled).toBe(true);
  });
});
