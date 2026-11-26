import { HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSelectHarness } from '@angular/material/select/testing';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { ErrorState } from '../api/error-state';
import {
  discussionScrumMaster,
  lobbyScrumMaster,
  revealedScrumMaster,
  SessionView,
  votingScrumMaster,
} from '../api/examples';
import { PreferencesStore } from '../api/preferences-store';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { IssuePanel, IssueSummary } from './issue-panel';

const SESSION_ID = 'K7P2QX9M';
const ISSUES_URL = `/api/sessions/${SESSION_ID}/issues`;
const ACTIVE_ISSUE_URL = `/api/sessions/${SESSION_ID}/active-issue`;

function issue(iid: number, title: string, weight: number | null = null): IssueSummary {
  return { iid, title, webUrl: `https://gitlab.example/group/project/-/issues/${iid}`, weight };
}

const FIRST_PAGE = [issue(43, 'Password reset'), issue(42, 'Login page')];
const SECOND_PAGE = [issue(41, 'Logout')];

describe('IssuePanel', () => {
  let http: HttpTestingController;
  let sockets: FakeSocketFactory;
  let store: SessionStore;
  let fixture: ComponentFixture<IssuePanel>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    sockets = new FakeSocketFactory();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: sockets.create },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    fixture.destroy();
    store.leave();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
    http.verify();
  });

  async function open(snapshot: SessionView, page = FIRST_PAGE, nextPage: number | null = null) {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token-sm',
    });
    store.enter(SESSION_ID);
    http.expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(IssuePanel);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    await fixture.whenStable();
    const request = http.expectOne((r) => r.url === ISSUES_URL);
    const saved = TestBed.inject(PreferencesStore).read();
    expect(params(request.request.params)).toEqual({
      weight: saved.weightFilter,
      period: saved.periodFilter,
    });
    request.flush({ items: page, nextPage });
    await fixture.whenStable();
  }

  function params(values: HttpParams): Record<string, string | null> {
    return Object.fromEntries(values.keys().map((key) => [key, values.get(key)]));
  }

  function texts(id: string): (string | undefined)[] {
    return all(id).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
  }

  async function searchFor(text: string): Promise<void> {
    const input = one('issue-search-input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await click('issue-search-submit');
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: FIRST_PAGE, nextPage: null });
    await fixture.whenStable();
  }

  async function receive(snapshot: SessionView): Promise<void> {
    sockets.last().receive({ type: 'session.state', payload: snapshot });
    await fixture.whenStable();
  }

  function all(id: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
    );
  }

  function one(id: string): HTMLElement {
    const found = all(id)[0] ?? document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (found === undefined || found === null) {
      throw new Error(`no element ${id}`);
    }
    return found;
  }

  function button(id: string): HTMLButtonElement {
    return one(id) as HTMLButtonElement;
  }

  async function click(id: string, index = 0): Promise<void> {
    (all(id)[index] ?? one(id)).click();
    await fixture.whenStable();
  }

  it('loads the first page of the issues and preselects the issue of the creation', async () => {
    await open(lobbyScrumMaster);

    expect(texts('issue-result')).toEqual([
      '#43 Password reset ohne Gewicht',
      '✓ #42 Login page ohne Gewicht',
    ]);
    expect(all('issue-result')[1].getAttribute('aria-pressed')).toBe('true');
    expect(one('issue-preview-iid').textContent?.trim()).toBe('#42');
    expect(one('issue-preview-title').textContent?.trim()).toBe('Login page');
    expect(one('issue-preview-link').getAttribute('href')).toBe(FIRST_PAGE[1].webUrl);
    expect(one('issue-preview-link').getAttribute('rel')).toBe('noopener noreferrer');
    expect(one('issue-preview-link').getAttribute('target')).toBe('_blank');
    expect(all('issue-load-more')).toHaveLength(0);
    expect(one('issue-release').textContent?.trim()).toBe('Freigeben');
    expect(button('issue-release').disabled).toBe(false);
  });

  it('shows the iid of a preselected issue that is not in the results', async () => {
    await open(lobbyScrumMaster, [issue(43, 'Password reset')]);

    expect(one('issue-preview-iid').textContent?.trim()).toBe('#42');
    expect(all('issue-preview-title')).toHaveLength(0);
    expect(button('issue-release').disabled).toBe(false);
  });

  it('changes the preview when another result is clicked', async () => {
    await open(lobbyScrumMaster);

    await click('issue-result', 0);

    expect(one('issue-preview-iid').textContent?.trim()).toBe('#43');
    expect(one('issue-preview-title').textContent?.trim()).toBe('Password reset');
  });

  it('searches with the trimmed text and replaces the results', async () => {
    await open(lobbyScrumMaster);
    const input = one('issue-search-input') as HTMLInputElement;
    input.value = '  login ';
    input.dispatchEvent(new Event('input'));

    await click('issue-search-submit');
    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(request.request.params.get('search')).toBe('login');
    expect(request.request.params.has('page')).toBe(false);
    request.flush({ items: [FIRST_PAGE[1]], nextPage: null });
    await fixture.whenStable();

    expect(all('issue-result')).toHaveLength(1);
  });

  it('appends the next page with the same search and hides the button on the last page', async () => {
    await open(lobbyScrumMaster, FIRST_PAGE, 2);

    await click('issue-load-more');
    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ items: SECOND_PAGE, nextPage: null });
    await fixture.whenStable();

    expect(all('issue-result')).toHaveLength(3);
    expect(all('issue-load-more')).toHaveLength(0);
  });

  it('releases the selected issue in the lobby without a dialog', async () => {
    await open(lobbyScrumMaster);
    await click('issue-result', 0);

    await click('issue-release');

    const request = http.expectOne(ACTIVE_ISSUE_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ issueIid: 43 });
    expect(document.querySelector('[data-testid="switch-dialog"]')).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('switches the issue in DISCUSSION without a dialog', async () => {
    await open(discussionScrumMaster);
    expect(one('issue-release').textContent?.trim()).toBe('Issue wechseln');
    await click('issue-result', 0);

    await click('issue-release');

    const request = http.expectOne(ACTIVE_ISSUE_URL);
    expect(request.request.body).toEqual({ issueIid: 43 });
    expect(document.querySelector('[data-testid="switch-dialog"]')).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('names the button Issue wechseln in VOTING and disables it for the active issue', async () => {
    await open(votingScrumMaster);

    expect(one('issue-release').textContent?.trim()).toBe('Issue wechseln');
    expect(all('issue-result')[1].getAttribute('aria-pressed')).toBe('true');
    expect(button('issue-release').disabled).toBe(true);

    await click('issue-result', 0);
    expect(button('issue-release').disabled).toBe(false);
  });

  it('disables the button while the result is being written to GitLab', async () => {
    await open(votingScrumMaster);
    await click('issue-result', 0);

    await receive({
      ...votingScrumMaster,
      round: { ...votingScrumMaster.round!, confirming: true },
    });

    expect(button('issue-release').disabled).toBe(true);
  });

  it('keeps the active issue when the switch is cancelled', async () => {
    await open(votingScrumMaster);
    await click('issue-result', 0);

    await click('issue-release');
    expect(document.querySelector('[data-testid="switch-dialog"]')).not.toBeNull();
    (document.querySelector('[data-testid="switch-cancel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    http.expectNone(ACTIVE_ISSUE_URL);
  });

  it('sends no switch when the confirmation of the round started while the dialog was open', async () => {
    await open(votingScrumMaster);
    await click('issue-result', 0);
    await click('issue-release');

    await receive({
      ...votingScrumMaster,
      round: { ...votingScrumMaster.round!, confirming: true },
    });
    (document.querySelector('[data-testid="switch-confirm"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    http.expectNone(ACTIVE_ISSUE_URL);
  });

  it('switches the issue after the confirmation', async () => {
    await open(votingScrumMaster);
    await click('issue-result', 0);

    await click('issue-release');
    (document.querySelector('[data-testid="switch-confirm"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const request = http.expectOne(ACTIVE_ISSUE_URL);
    expect(request.request.body).toEqual({ issueIid: 43 });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('shows the GitLab error with a retry and lists the issues after a successful retry', async () => {
    await open(lobbyScrumMaster);
    const input = one('issue-search-input') as HTMLInputElement;
    input.value = 'login';
    input.dispatchEvent(new Event('input'));

    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'GITLAB_ERROR', title: 'Bad Gateway', status: 502 },
        {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    expect(one('issue-results-error-message').textContent?.trim()).toBe(
      'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    );
    expect(one('issue-results-retry').textContent?.trim()).toBe('↻ Erneut versuchen');
    expect(all('issue-results-empty')).toHaveLength(0);
    expect(TestBed.inject(ErrorState).error()).toBeNull();

    await click('issue-results-retry');
    const retry = http.expectOne((r) => r.url === ISSUES_URL);
    expect(retry.request.params.get('search')).toBe('login');
    retry.flush({ items: [FIRST_PAGE[1]], nextPage: null });
    await fixture.whenStable();

    expect(all('issue-results-error')).toHaveLength(0);
    expect(texts('issue-result')).toEqual(['✓ #42 Login page ohne Gewicht']);
  });

  it('keeps the loaded issues and shows no empty state and no error state after a failed load with another code', async () => {
    await open(lobbyScrumMaster);

    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'INVALID_STATE', title: 'Conflict', status: 409 },
        {
          status: 409,
          statusText: 'Conflict',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    expect(all('issue-result')).toHaveLength(2);
    expect(all('issue-results-empty')).toHaveLength(0);
    expect(all('issue-results-error')).toHaveLength(0);
  });

  it('shows the empty state when a load without issues follows a failed load with another code', async () => {
    await open(lobbyScrumMaster);
    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'INVALID_STATE', title: 'Conflict', status: 409 },
        {
          status: 409,
          statusText: 'Conflict',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    await click('issue-search-submit');
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null, total: 0 });
    await fixture.whenStable();

    expect(texts('issue-results-empty')).toEqual(['Keine Issues gefunden']);
  });

  it('keeps the loaded issues and shows no empty state after a failed load more with another code', async () => {
    await open(lobbyScrumMaster, FIRST_PAGE, 2);

    await click('issue-load-more');
    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(request.request.params.get('page')).toBe('2');
    request.flush(
      { errorCode: 'INVALID_STATE', title: 'Conflict', status: 409 },
      {
        status: 409,
        statusText: 'Conflict',
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
    await fixture.whenStable();

    expect(all('issue-result')).toHaveLength(2);
    expect(all('issue-results-empty')).toHaveLength(0);
  });

  it('shows no empty state when the first load fails with another code', async () => {
    await open(lobbyScrumMaster, []);
    expect(all('issue-results-empty')).toHaveLength(1);

    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'INVALID_STATE', title: 'Conflict', status: 409 },
        {
          status: 409,
          statusText: 'Conflict',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    expect(all('issue-results-empty')).toHaveLength(0);
    expect(all('issue-filter-reset')).toHaveLength(0);
  });

  it('shows the access denied text of GitLab in the error state and clears the banner', async () => {
    await open(lobbyScrumMaster);

    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'GITLAB_ACCESS_DENIED', title: 'Bad Gateway', status: 502 },
        {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    expect(one('issue-results-error-message').textContent?.trim()).toBe(
      'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
    );
    expect(one('issue-results-retry').textContent?.trim()).toBe('↻ Erneut versuchen');
    expect(TestBed.inject(ErrorState).error()).toBeNull();
  });

  it('keeps the loaded issues and appends the next page after a failed load more is retried', async () => {
    await open(lobbyScrumMaster, FIRST_PAGE, 2);

    await click('issue-load-more');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { errorCode: 'GITLAB_ERROR', title: 'Bad Gateway', status: 502 },
        {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    await fixture.whenStable();

    expect(all('issue-results-error')).toHaveLength(1);
    expect(all('issue-result')).toHaveLength(2);
    expect(all('issue-load-more')).toHaveLength(0);

    await click('issue-results-retry');
    const retry = http.expectOne((r) => r.url === ISSUES_URL);
    expect(retry.request.params.get('page')).toBe('2');
    retry.flush({ items: SECOND_PAGE, nextPage: null });
    await fixture.whenStable();

    expect(all('issue-results-error')).toHaveLength(0);
    expect(all('issue-result')).toHaveLength(3);
  });
  it('shows the weight of every issue or the text ohne Gewicht', async () => {
    await open(lobbyScrumMaster, [issue(46, 'Export', 5), issue(42, 'Login page')]);

    expect(texts('issue-result-weight')).toEqual(['Gewicht 5', 'ohne Gewicht']);
    expect(one('issue-filter-weight-none').getAttribute('class')).toContain(
      'mat-button-toggle-checked',
    );
  });

  it('loads page 1 with the weight filter Alle and keeps the search text', async () => {
    await open(lobbyScrumMaster, FIRST_PAGE, 2);
    await searchFor('login');

    one('issue-filter-weight-all').querySelector('button')!.click();
    await fixture.whenStable();

    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(params(request.request.params)).toEqual({
      search: 'login',
      weight: 'ALL',
      period: 'ALL',
    });
    request.flush({ items: [issue(46, 'Export', 3)], nextPage: null });
    await fixture.whenStable();
    expect(texts('issue-result')).toEqual(['#46 Export Gewicht 3']);
  });

  it('loads page 1 with the period 1 Monat and keeps the search text and the weight filter', async () => {
    await open(lobbyScrumMaster, FIRST_PAGE, 2);
    await searchFor('login');
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    expect(await select.getValueText()).toBe('Alle');

    await select.open();
    await select.clickOptions({ text: '1 Monat' });
    await fixture.whenStable();

    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(params(request.request.params)).toEqual({
      search: 'login',
      weight: 'NONE',
      period: 'MONTH',
    });
    request.flush({ items: [], nextPage: null });
  });

  it('reloads the list with the current filters when the round returns from REVEALED to LOBBY', async () => {
    await open(revealedScrumMaster);
    one('issue-filter-weight-any').querySelector('button')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: FIRST_PAGE, nextPage: null });
    await fixture.whenStable();

    await receive(lobbyScrumMaster);

    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(params(request.request.params)).toEqual({ weight: 'ANY', period: 'ALL' });
    request.flush({ items: [issue(42, 'Login page', 5)], nextPage: null });
    await fixture.whenStable();
    expect(texts('issue-result-weight')).toEqual(['Gewicht 5']);
  });

  it('does not reload the list when the round starts', async () => {
    await open(lobbyScrumMaster);

    await receive(votingScrumMaster);

    http.expectNone((r) => r.url === ISSUES_URL);
  });

  it('names the project of the session with name and id, or the id alone', async () => {
    await open({
      ...lobbyScrumMaster,
      project: {
        id: 1234,
        name: 'Frontend',
        pathWithNamespace: 'webshop/frontend',
        webUrl: 'https://gitlab.example/webshop/frontend',
      },
    });
    expect(texts('issue-panel-project')).toEqual(['Projekt: Frontend · 1234']);

    await receive({ ...lobbyScrumMaster, project: null });

    expect(texts('issue-panel-project')).toEqual(['Projekt: 1234']);
  });

  it('counts the loaded issues against the total of GitLab, or alone without a total', async () => {
    await open(lobbyScrumMaster);
    expect(texts('issue-count')).toEqual(['2 Issues']);

    one('issue-filter-weight-all').querySelector('button')!.click();
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush({ items: FIRST_PAGE, nextPage: 2, total: 23 });
    await fixture.whenStable();
    expect(texts('issue-count')).toEqual(['2 von 23 Issues']);

    await click('issue-load-more');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush({ items: SECOND_PAGE, nextPage: null, total: 23 });
    await fixture.whenStable();
    expect(texts('issue-count')).toEqual(['3 von 23 Issues']);
  });

  it('shows the selection with its title and the release button below the list', async () => {
    await open(lobbyScrumMaster);

    expect(texts('issue-preview')).toEqual(['Ausgewählt: #42 Login page']);
    expect(one('issue-release').textContent?.trim()).toBe('Freigeben');
  });

  it('resets the search and the filters to the defaults from the empty state', async () => {
    await open(lobbyScrumMaster);
    one('issue-filter-weight-all').querySelector('button')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null, total: 0 });
    await fixture.whenStable();
    const input = one('issue-search-input') as HTMLInputElement;
    input.value = 'kein Treffer';
    input.dispatchEvent(new Event('input'));
    await click('issue-search-submit');
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null, total: 0 });
    await fixture.whenStable();
    expect(texts('issue-results-empty')).toEqual(['Keine Issues gefunden']);
    expect(all('issue-count')).toHaveLength(0);

    await click('issue-filter-reset');

    const request = http.expectOne((r) => r.url === ISSUES_URL);
    expect(params(request.request.params)).toEqual({ weight: 'NONE', period: 'ALL' });
    request.flush({ items: FIRST_PAGE, nextPage: null, total: 2 });
    await fixture.whenStable();
    expect((one('issue-search-input') as HTMLInputElement).value).toBe('');
    expect(one('issue-filter-weight-none').getAttribute('class')).toContain(
      'mat-button-toggle-checked',
    );
    expect(all('issue-results-empty')).toHaveLength(0);
    expect(texts('issue-count')).toEqual(['2 von 2 Issues']);
  });

  it('shows the error state with its title, the text of the code and the retry', async () => {
    await open(lobbyScrumMaster);
    await click('issue-search-submit');
    http
      .expectOne((r) => r.url === ISSUES_URL)
      .flush(
        { type: 'about:blank', title: 'Bad Gateway', status: 502, errorCode: 'GITLAB_ERROR' },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await fixture.whenStable();

    expect(one('issue-results-error').getAttribute('role')).toBe('alert');
    expect(one('issue-results-error').textContent).toContain(
      'Die Issues konnten nicht geladen werden.',
    );
    expect(texts('issue-results-error-message')).toEqual([
      'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    ]);
    expect(texts('issue-results-retry')).toEqual(['↻ Erneut versuchen']);
    expect(
      one('issue-results-retry').querySelector('.app-symbol[aria-hidden="true"]')?.textContent,
    ).toBe('↻');
  });

  it('starts with the saved filters and loads the issues with them', async () => {
    TestBed.inject(PreferencesStore).save({ weightFilter: 'ANY', periodFilter: 'MONTH' });

    await open(lobbyScrumMaster);

    expect(one('issue-filter-weight-any').getAttribute('class')).toContain(
      'mat-button-toggle-checked',
    );
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    expect(await select.getValueText()).toBe('1 Monat');
  });

  it('saves every change of the filters', async () => {
    await open(lobbyScrumMaster);
    const preferences = TestBed.inject(PreferencesStore);

    one('issue-filter-weight-any').querySelector('button')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null });
    expect(preferences.read().weightFilter).toBe('ANY');

    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: '1 Jahr' });
    await fixture.whenStable();
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null });
    expect(preferences.read().periodFilter).toBe('YEAR');
  });

  it('saves the defaults when the filters are reset', async () => {
    TestBed.inject(PreferencesStore).save({ weightFilter: 'ALL', periodFilter: 'WEEK' });
    await open(lobbyScrumMaster, []);

    await click('issue-filter-reset');
    http.expectOne((r) => r.url === ISSUES_URL).flush({ items: [], nextPage: null });

    expect(TestBed.inject(PreferencesStore).read()).toMatchObject({
      weightFilter: 'NONE',
      periodFilter: 'ALL',
    });
  });
});
