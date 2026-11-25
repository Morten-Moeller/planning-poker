import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SwitchIssueDialog, switchIssueText } from './switch-issue-dialog';
import type { SwitchIssueData } from './switch-issue-dialog';
import { installPopupAnimations } from './testing/popup-animations';

const RUNNING: SwitchIssueData = { revealed: false, roundNumber: 2, issueIid: 42, votes: 0 };

function show(data: SwitchIssueData, open = true) {
  const onClose = vi.fn<(confirmed: boolean) => void>();
  const view = render(<SwitchIssueDialog open={open} data={data} onClose={onClose} />);
  return { onClose, ...view };
}

describe('SwitchIssueDialog', () => {
  beforeAll(() => {
    installPopupAnimations();
  });

  it.each([
    {
      name: 'a revealed round',
      data: { ...RUNNING, revealed: true, votes: 2 },
      text: 'Runde 2 zu #42 ist aufgedeckt und hat keinen Endwert. Beim Wechsel bleibt sie ohne Endwert im Protokoll.',
    },
    {
      name: 'a running round without a vote',
      data: RUNNING,
      text: 'Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, es gibt noch keine abgegebene Schätzung.',
    },
    {
      name: 'a running round with one vote',
      data: { ...RUNNING, votes: 1 },
      text: 'Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 1 abgegebene Schätzung wird verworfen.',
    },
    {
      name: 'a running round with three votes',
      data: { ...RUNNING, roundNumber: 1, issueIid: 7, votes: 3 },
      text: 'Runde 1 zu #7 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 3 abgegebenen Schätzungen werden verworfen.',
    },
  ])('names $name', ({ data, text }) => {
    expect(switchIssueText(data)).toBe(text);

    show(data);

    expect(screen.getByTestId('switch-text').textContent).toBe(text);
  });

  it('is a dialog of the UI SDK with the title and the text as its name and description', () => {
    show(RUNNING);

    const dialog = screen.getByTestId('switch-dialog');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content');
    const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent).toBe('Issue wechseln?');
    expect(title?.tagName).toBe('H2');
    const described = dialog.getAttribute('aria-describedby') ?? '';
    expect(described.split(' ')).toContain(screen.getByTestId('switch-text').id);
    expect(screen.getByTestId('switch-cancel').textContent).toBe('Abbrechen');
    expect(screen.getByTestId('switch-confirm').textContent).toBe('Issue wechseln');
  });

  it('shows nothing while it is closed', () => {
    show(RUNNING, false);

    expect(screen.queryByTestId('switch-dialog')).toBeNull();
  });

  it('closes without a confirmation on Abbrechen', async () => {
    const { onClose } = show(RUNNING);

    await userEvent.setup().click(screen.getByTestId('switch-cancel'));

    expect(onClose.mock.calls).toEqual([[false]]);
  });

  it('closes without a confirmation on Escape', async () => {
    const { onClose } = show(RUNNING);

    await userEvent.setup().keyboard('{Escape}');

    expect(onClose.mock.calls).toEqual([[false]]);
  });

  it('closes with the confirmation on Issue wechseln', async () => {
    const { onClose } = show(RUNNING);

    await userEvent.setup().click(screen.getByTestId('switch-confirm'));

    expect(onClose.mock.calls).toEqual([[true]]);
  });
});
