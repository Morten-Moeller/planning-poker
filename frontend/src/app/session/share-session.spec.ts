import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShareSession } from './share-session';

const SESSION_ID = 'K7P2QX9M';
const INVITES = { developer: 'dev-Code_1', viewer: 'view-Code_2' };
const DEVELOPER_LINK = `${location.origin}/session/${SESSION_ID}/join?invite=dev-Code_1`;
const VIEWER_LINK = `${location.origin}/session/${SESSION_ID}/join?invite=view-Code_2&as=viewer`;

describe('ShareSession', () => {
  let fixture: ComponentFixture<ShareSession>;
  let written: string[];
  let rejects: boolean;

  beforeEach(async () => {
    written = [];
    rejects = false;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          if (rejects) {
            return Promise.reject(new DOMException('denied', 'NotAllowedError'));
          }
          written.push(value);
          return Promise.resolve();
        },
      },
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ShareSession);
    fixture.componentRef.setInput('sessionId', SESSION_ID);
    fixture.componentRef.setInput('invites', INVITES);
    await fixture.whenStable();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  function element(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  }

  function normalized(node: Element | null | undefined): string {
    return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  it.each([
    ['copy-link-developer', 'Einladung Entwickler kopieren'],
    ['copy-link-viewer', 'Einladung Zuschauer kopieren'],
  ])('labels the button %s and shows Kopieren', (id, label) => {
    expect(element(id)?.getAttribute('aria-label')).toBe(label);
    expect(normalized(element(id))).toBe('⧉ Kopieren');
  });

  it('names both invite rows and has no row for the session id', () => {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.label'),
    ).map((label) => normalized(label));

    expect(labels).toEqual(['Einladung Entwickler', 'Einladung Zuschauer']);
    expect(element('share-session-id')).toBeNull();
    expect(element('copy-session-id')).toBeNull();
    expect(element('share-link')).toBeNull();
  });

  it('shows Neue Sitzung as a link to the start page', () => {
    expect(normalized(element('new-session'))).toBe('＋ Neue Sitzung');
    expect(element('new-session')?.getAttribute('href')).toBe('/');
  });

  it('shows both invite links with the code from the origin of the page', () => {
    expect(element('share-link-developer')?.textContent).toBe(DEVELOPER_LINK);
    expect(element('share-link-viewer')?.textContent).toBe(VIEWER_LINK);
  });

  it('encodes the code in the link', async () => {
    fixture.componentRef.setInput('invites', { developer: 'a+b/c', viewer: 'd&e' });
    await fixture.whenStable();

    expect(element('share-link-developer')?.textContent).toBe(
      `${location.origin}/session/${SESSION_ID}/join?invite=a%2Bb%2Fc`,
    );
    expect(element('share-link-viewer')?.textContent).toBe(
      `${location.origin}/session/${SESSION_ID}/join?invite=d%26e&as=viewer`,
    );
  });

  it.each([
    ['developer', DEVELOPER_LINK, 'viewer'],
    ['viewer', VIEWER_LINK, 'developer'],
  ])('copies the %s link and shows Kopiert', async (target, link, other) => {
    element(`copy-link-${target}`)?.click();
    await fixture.whenStable();

    expect(written).toEqual([link]);
    expect(element(`copy-link-${target}-done`)?.textContent?.trim()).toBe('Kopiert');
    expect(normalized(element(`copy-link-${target}-done`)?.parentElement)).toBe('✓ Kopiert');
    expect(element(`copy-link-${other}-done`)).toBeNull();
  });

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function after(millis: number): Promise<void> {
      await vi.advanceTimersByTimeAsync(millis);
      fixture.detectChanges();
    }

    it('hides Kopiert 3 s after the copy', async () => {
      element('copy-link-developer')?.click();
      await after(0);
      expect(element('copy-link-developer-done')).not.toBeNull();

      await after(2999);
      expect(element('copy-link-developer-done')).not.toBeNull();

      await after(1);
      expect(element('copy-link-developer-done')).toBeNull();
      expect(normalized(element('copy-link-developer'))).toBe('⧉ Kopieren');
    });

    it('starts the 3 s again with a second click', async () => {
      element('copy-link-viewer')?.click();
      await after(2000);
      element('copy-link-viewer')?.click();
      await after(0);

      await after(2999);
      expect(element('copy-link-viewer-done')).not.toBeNull();

      await after(1);
      expect(element('copy-link-viewer-done')).toBeNull();
    });

    it('keeps the failure status', async () => {
      rejects = true;
      element('copy-link-developer')?.click();
      await after(10000);

      expect(element('copy-link-developer-failed')).not.toBeNull();
    });

    it('clears the timer when the component is destroyed', async () => {
      element('copy-link-developer')?.click();
      await after(0);
      expect(vi.getTimerCount()).toBe(1);

      fixture.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it.each([
    ['copy-link-developer', 'copy-link-developer-failed', 'copy-link-developer-done'],
    ['copy-link-viewer', 'copy-link-viewer-failed', 'copy-link-viewer-done'],
  ])('shows a status to copy by hand when %s fails', async (button, failed, done) => {
    rejects = true;

    element(button)?.click();
    await fixture.whenStable();

    expect(written).toEqual([]);
    expect(element(failed)?.textContent?.trim()).toBe(
      'Kopieren nicht möglich, bitte von Hand kopieren',
    );
    expect(element(failed)?.getAttribute('role')).toBe('status');
    expect(normalized(element(failed)?.parentElement)).toBe(
      '⚠ Kopieren nicht möglich, bitte von Hand kopieren',
    );
    expect(element(done)).toBeNull();
  });
});
