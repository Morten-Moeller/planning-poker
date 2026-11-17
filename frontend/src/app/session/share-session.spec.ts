import { ComponentFixture, TestBed } from '@angular/core/testing';
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
