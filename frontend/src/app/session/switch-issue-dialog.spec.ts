import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { SwitchIssueData, SwitchIssueDialog } from './switch-issue-dialog';

describe('SwitchIssueDialog', () => {
  let closedWith: boolean | undefined | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    closedWith = null;
  });

  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
  });

  async function open(data: SwitchIssueData): Promise<void> {
    TestBed.inject(MatDialog)
      .open<SwitchIssueDialog, SwitchIssueData, boolean>(SwitchIssueDialog, { data })
      .afterClosed()
      .subscribe((result) => (closedWith = result));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function text(id: string): string {
    return (
      document
        .querySelector<HTMLElement>(`[data-testid="${id}"]`)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? ''
    );
  }

  it.each([
    [
      3,
      'Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 3 abgegebenen Schätzungen werden verworfen.',
    ],
    [
      1,
      'Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 1 abgegebene Schätzung wird verworfen.',
    ],
    [
      0,
      'Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, es gibt noch keine abgegebene Schätzung.',
    ],
  ])('names round, issue and %i submitted votes of a running round', async (votes, expected) => {
    await open({ revealed: false, roundNumber: 2, issueIid: 42, votes });

    expect(text('switch-text')).toBe(expected);
    expect(text('switch-confirm')).toBe('Issue wechseln');
    expect(text('switch-cancel')).toBe('Abbrechen');
  });

  it('names the revealed round without a final value', async () => {
    await open({ revealed: true, roundNumber: 1, issueIid: 43, votes: 2 });

    expect(text('switch-text')).toBe(
      'Runde 1 zu #43 ist aufgedeckt und hat keinen Endwert. Beim Wechsel bleibt sie ohne Endwert im Protokoll.',
    );
  });

  it('closes with true on „Issue wechseln“ and with false on „Abbrechen“', async () => {
    await open({ revealed: false, roundNumber: 1, issueIid: 42, votes: 1 });
    document.querySelector<HTMLButtonElement>('[data-testid="switch-confirm"]')!.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(closedWith).toBe(true);

    await open({ revealed: false, roundNumber: 1, issueIid: 42, votes: 1 });
    document.querySelector<HTMLButtonElement>('[data-testid="switch-cancel"]')!.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(closedWith).toBe(false);
  });
});
