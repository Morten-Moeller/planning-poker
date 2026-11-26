import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MediaMatcher } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { revealedScrumMaster, SessionView, votingDeveloper } from '../api/examples';
import { SessionStore } from '../api/session-store';
import { FakeSocketFactory } from '../api/testing/fake-web-socket';
import { TokenStore } from '../api/token-store';
import { WEB_SOCKET_FACTORY } from '../api/web-socket-factory';
import { ActiveIssue, IssueView, NARROW_LAYOUT } from './active-issue';

const SESSION_ID = 'K7P2QX9M';

const ISSUE: IssueView = {
  iid: 44,
  title: 'Script check',
  description:
    '**fett**\n\n<script>window.__pwned = true</script>\n\n<img src="x" onerror="window.__pwned = true">',
  webUrl: 'https://gitlab.example/group/project/-/issues/44',
};

class FixedMediaMatcher {
  constructor(private readonly narrow: boolean) {}

  matchMedia(query: string): MediaQueryList {
    return {
      matches: query === NARROW_LAYOUT && this.narrow,
      media: query,
      addListener: () => undefined,
      removeListener: () => undefined,
    } as unknown as MediaQueryList;
  }
}

describe('ActiveIssue', () => {
  let fixture: ComponentFixture<ActiveIssue>;
  let store: SessionStore;

  function setUp(narrow = false): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WEB_SOCKET_FACTORY, useValue: new FakeSocketFactory().create },
        { provide: MediaMatcher, useValue: new FixedMediaMatcher(narrow) },
      ],
    });
    store = TestBed.inject(SessionStore);
  }

  async function render(snapshot: SessionView, issue: IssueView = ISSUE): Promise<void> {
    TestBed.inject(TokenStore).store(SESSION_ID, {
      participantId: snapshot.me.participantId,
      token: 'token',
    });
    store.enter(SESSION_ID);
    TestBed.inject(HttpTestingController).expectOne(`/api/sessions/${SESSION_ID}`).flush(snapshot);
    fixture = TestBed.createComponent(ActiveIssue);
    fixture.componentRef.setInput('issue', issue);
    await fixture.whenStable();
  }

  afterEach(() => {
    store.leave();
    sessionStorage.clear();
  });

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      `[data-testid="${id}"]`,
    );
  }

  function frame(): HTMLElement {
    return element('active-issue-description')!.parentElement!;
  }

  it('shows the title, the iid and a link to GitLab in a new tab', async () => {
    setUp();
    await render(votingDeveloper);

    expect(element('active-issue-title')?.textContent?.trim()).toBe('Script check');
    expect(element('active-issue-iid')?.textContent?.trim()).toBe('#44');
    const link = element('active-issue-link')!;
    expect(link.getAttribute('href')).toBe(ISSUE.webUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows the arrow of the GitLab link in its own hidden span with the class app-symbol', async () => {
    setUp();
    await render(votingDeveloper);

    const link = element('active-issue-link')!;
    const symbol = link.querySelector<HTMLElement>('.app-symbol')!;
    expect(link.textContent?.trim()).toBe('In GitLab öffnen ↗');
    expect(symbol.textContent).toBe('↗');
    expect(symbol.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders Markdown and removes script elements and event attributes', async () => {
    setUp();
    await render(votingDeveloper);
    const description = element('active-issue-description')!;

    expect(description.querySelector('strong')?.textContent).toBe('fett');
    expect(description.querySelector('script')).toBeNull();
    expect(description.querySelector('[onerror]')).toBeNull();
    expect(description.innerHTML).not.toContain('__pwned');
  });

  it('shows the whole description while the round runs on a wide screen', async () => {
    setUp();
    await render(votingDeveloper);

    expect(frame().classList).not.toContain('collapsed');
    expect(element('active-issue-expand')).toBeNull();
  });

  it('collapses the description in REVEALED and expands it on request', async () => {
    setUp();
    await render(revealedScrumMaster);
    expect(frame().classList).toContain('collapsed');
    const expand = element('active-issue-expand')!;
    expect(expand.textContent?.trim()).toBe('▾ Ganze Beschreibung anzeigen');
    expect(expand.querySelector('.app-symbol[aria-hidden="true"]')?.textContent).toBe('▾');
    expect(expand.getAttribute('aria-controls')).toBe('active-issue-description');

    expand.click();
    await fixture.whenStable();

    expect(frame().classList).not.toContain('collapsed');
    expect(element('active-issue-expand')).toBeNull();
  });

  it('collapses the description again after it was expanded in REVEALED', async () => {
    setUp();
    await render(revealedScrumMaster);
    expect(element('active-issue-collapse')).toBeNull();
    element('active-issue-expand')!.click();
    await fixture.whenStable();
    const collapse = element('active-issue-collapse')!;
    expect(collapse.textContent?.trim()).toBe('▴ Beschreibung einklappen');
    expect(collapse.querySelector('.app-symbol[aria-hidden="true"]')?.textContent).toBe('▴');
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(collapse.getAttribute('aria-controls')).toBe('active-issue-description');

    collapse.click();
    await fixture.whenStable();

    expect(frame().classList).toContain('collapsed');
    expect(element('active-issue-collapse')).toBeNull();
    expect(element('active-issue-expand')).not.toBeNull();
  });

  it('collapses the description again on a narrow screen during the round', async () => {
    setUp(true);
    await render(votingDeveloper);
    element('active-issue-expand')!.click();
    await fixture.whenStable();

    element('active-issue-collapse')!.click();
    await fixture.whenStable();

    expect(frame().classList).toContain('collapsed');
  });

  it('shows no collapse button while the description cannot collapse', async () => {
    setUp();
    await render(votingDeveloper);

    expect(element('active-issue-collapse')).toBeNull();
  });

  it('collapses the description on a narrow screen during the round', async () => {
    setUp(true);
    await render(votingDeveloper);

    expect(frame().classList).toContain('collapsed');
    expect(element('active-issue-expand')).not.toBeNull();
  });

  it('shows no expand button for an empty description', async () => {
    setUp();
    await render(revealedScrumMaster, { ...ISSUE, description: '' });

    expect(frame().classList).not.toContain('collapsed');
    expect(element('active-issue-expand')).toBeNull();
    expect(element('active-issue-collapse')).toBeNull();
  });
});
