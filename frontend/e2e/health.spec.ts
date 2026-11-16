import { expect, test } from '@playwright/test';

test('start page shows that the backend is reachable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
});
