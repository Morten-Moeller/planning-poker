import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmSuccess, ConfirmSuccessData } from './confirm-success';

const WEB_URL = 'https://gitlab.example/group/project/-/issues/42';

describe('ConfirmSuccess', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
  });

  afterEach(() => {
    TestBed.inject(MatSnackBar).dismiss();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
  });

  async function show(data: ConfirmSuccessData): Promise<void> {
    TestBed.inject(MatSnackBar).openFromComponent<ConfirmSuccess, ConfirmSuccessData>(
      ConfirmSuccess,
      { data },
    );
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function element(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  }

  it('names the final value and the issue and opens the issue in a new tab', async () => {
    await show({ card: '5', issueIid: 42, webUrl: WEB_URL });

    expect(element('confirm-success')?.textContent?.trim()).toBe(
      '✓ Endwert 5 in GitLab-Issue #42 gespeichert.',
    );
    const open = element('confirm-success-open');
    expect(open?.textContent?.trim()).toBe('Öffnen');
    expect(open?.getAttribute('href')).toBe(WEB_URL);
    expect(open?.getAttribute('target')).toBe('_blank');
    expect(open?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('names the coffee card by its name', async () => {
    await show({ card: 'COFFEE', issueIid: 43, webUrl: WEB_URL });

    expect(element('confirm-success')?.textContent?.trim()).toBe(
      '✓ Endwert Kaffeepause in GitLab-Issue #43 gespeichert.',
    );
  });

  it('names the final value without an issue number when the issue is unknown', async () => {
    await show({ card: '8', issueIid: null, webUrl: null });

    expect(element('confirm-success')?.textContent?.trim()).toBe(
      '✓ Endwert 8 in GitLab gespeichert.',
    );
    expect(element('confirm-success-open')).toBeNull();
  });
});
