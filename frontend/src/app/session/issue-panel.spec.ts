import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { apiErrorInterceptor } from '../api/api-error.interceptor';
import { authInterceptor } from '../api/auth.interceptor';
import { lobbyScrumMaster, SessionView, votingScrumMaster } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { IssuePanel, IssueSummary } from './issue-panel';

const SESSION_ID = 'K7P2QX9M';
const ISSUES_URL = `/api/sessions/${SESSION_ID}/issues`;
const ACTIVE_ISSUE_URL = `/api/sessions/${SESSION_ID}/active-issue`;

function issue(iid: number, title: string): IssueSummary {
  return { iid, title, webUrl: `https://gitlab.example/group/project/-/issues/${iid}` };
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
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ items: page, nextPage });
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

    expect(all('issue-result').map((node) => node.textContent?.trim())).toEqual([
      '#43 Password reset',
      '#42 Login page',
    ]);
    expect(all('issue-result')[1].getAttribute('aria-pressed')).toBe('true');
    expect(one('issue-preview-iid').textContent?.trim()).toBe('#42');
    expect(one('issue-preview-title').textContent?.trim()).toBe('Login page');
    expect(one('issue-preview-link').getAttribute('href')).toBe(FIRST_PAGE[1].webUrl);
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
});
