import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShareSession } from './share-session';

const SESSION_ID = 'K7P2QX9M';

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
    ['copy-link', 'Link kopieren'],
    ['copy-session-id', 'Session-ID kopieren'],
  ])('labels the button %s and shows Kopieren', (id, label) => {
    expect(element(id)?.getAttribute('aria-label')).toBe(label);
    expect(normalized(element(id))).toBe('⧉ Kopieren');
  });

  it('shows no Neue Sitzung to a developer', () => {
    expect(element('new-session')).toBeNull();
  });

  it('shows Neue Sitzung to the scrum master as a link to the start page', async () => {
    fixture.componentRef.setInput('scrumMaster', true);
    await fixture.whenStable();

    expect(normalized(element('new-session'))).toBe('＋ Neue Sitzung');
    expect(element('new-session')?.getAttribute('href')).toBe('/');
  });

  it('shows the join link from the origin of the page and the session id', () => {
    expect(element('share-link')?.textContent).toBe(
      `${location.origin}/session/${SESSION_ID}/join`,
    );
    expect(element('share-session-id')?.textContent).toBe(SESSION_ID);
  });

  it('copies the join link and shows Kopiert', async () => {
    element('copy-link')?.click();
    await fixture.whenStable();

    expect(written).toEqual([`${location.origin}/session/${SESSION_ID}/join`]);
    expect(element('copy-link-done')?.textContent?.trim()).toBe('Kopiert');
    expect(normalized(element('copy-link-done')?.parentElement)).toBe('✓ Kopiert');
    expect(element('copy-session-id-done')).toBeNull();
  });

  it('copies the session id and shows Kopiert', async () => {
    element('copy-session-id')?.click();
    await fixture.whenStable();

    expect(written).toEqual([SESSION_ID]);
    expect(element('copy-session-id-done')?.textContent?.trim()).toBe('Kopiert');
    expect(element('copy-link-done')).toBeNull();
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
      element('copy-link')?.click();
      await after(0);
      expect(element('copy-link-done')).not.toBeNull();

      await after(2999);
      expect(element('copy-link-done')).not.toBeNull();

      await after(1);
      expect(element('copy-link-done')).toBeNull();
      expect(normalized(element('copy-link'))).toBe('⧉ Kopieren');
    });

    it('starts the 3 s again with a second click', async () => {
      element('copy-session-id')?.click();
      await after(2000);
      element('copy-session-id')?.click();
      await after(0);

      await after(2999);
      expect(element('copy-session-id-done')).not.toBeNull();

      await after(1);
      expect(element('copy-session-id-done')).toBeNull();
    });

    it('keeps the failure status', async () => {
      rejects = true;
      element('copy-link')?.click();
      await after(10000);

      expect(element('copy-link-failed')).not.toBeNull();
    });

    it('clears the timer when the component is destroyed', async () => {
      element('copy-link')?.click();
      await after(0);
      expect(vi.getTimerCount()).toBe(1);

      fixture.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it.each([
    ['copy-link', 'copy-link-failed', 'copy-link-done'],
    ['copy-session-id', 'copy-session-id-failed', 'copy-session-id-done'],
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
