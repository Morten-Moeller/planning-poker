import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareSession } from './share-session';

const SESSION_ID = 'K7P2QX9M';

describe('ShareSession', () => {
  let fixture: ComponentFixture<ShareSession>;
  let written: string[];

  beforeEach(async () => {
    written = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
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
    expect(element('copy-session-id-done')).toBeNull();
  });

  it('copies the session id and shows Kopiert', async () => {
    element('copy-session-id')?.click();
    await fixture.whenStable();

    expect(written).toEqual([SESSION_ID]);
    expect(element('copy-session-id-done')?.textContent?.trim()).toBe('Kopiert');
    expect(element('copy-link-done')).toBeNull();
  });
});
