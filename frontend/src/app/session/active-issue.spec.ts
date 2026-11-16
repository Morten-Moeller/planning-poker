import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveIssue, IssueView } from './active-issue';

const ISSUE: IssueView = {
  iid: 44,
  title: 'Script check',
  description:
    '**fett**\n\n<script>window.__pwned = true</script>\n\n<img src="x" onerror="window.__pwned = true">',
  webUrl: 'https://gitlab.example/group/project/-/issues/44',
};

describe('ActiveIssue', () => {
  let fixture: ComponentFixture<ActiveIssue>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ActiveIssue);
    fixture.componentRef.setInput('issue', ISSUE);
    await fixture.whenStable();
  });

  function element(id: string): HTMLElement {
    const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      `[data-testid="${id}"]`,
    );
    if (found === null) {
      throw new Error(`no element ${id}`);
    }
    return found;
  }

  it('shows the title, the iid and a link to GitLab in a new tab', () => {
    expect(element('active-issue-title').textContent?.trim()).toBe('Script check');
    expect(element('active-issue-iid').textContent?.trim()).toBe('#44');
    const link = element('active-issue-link');
    expect(link.getAttribute('href')).toBe(ISSUE.webUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });

  it('renders Markdown and removes script elements and event attributes', () => {
    const description = element('active-issue-description');

    expect(description.querySelector('strong')?.textContent).toBe('fett');
    expect(description.querySelector('script')).toBeNull();
    expect(description.querySelector('[onerror]')).toBeNull();
    expect(description.innerHTML).not.toContain('__pwned');
  });
});
