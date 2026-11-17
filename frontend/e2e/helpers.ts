import { Page, expect } from '@playwright/test';

export async function startVoting(scrumMaster: Page): Promise<void> {
  await expect(scrumMaster.getByTestId('session-phase')).toHaveText('Diskussion');
  await scrumMaster.getByTestId('round-start').click();
  await expect(scrumMaster.getByTestId('session-phase')).toHaveText('Runde läuft');
}
