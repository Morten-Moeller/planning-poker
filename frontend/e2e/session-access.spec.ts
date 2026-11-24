import { expect, test } from '@playwright/test';

const SESSION_WITHOUT_TOKEN = 'ABCDEFGH';
const UNKNOWN_SESSION_ID = 'XYZ23457';

test(
  'a room without a stored token leads to the join page',
  { tag: '@react' },
  async ({ page }) => {
    await page.goto(`/session/${SESSION_WITHOUT_TOKEN}`);

    await expect(page).toHaveURL(new RegExp(`/session/${SESSION_WITHOUT_TOKEN}/join$`));
    await expect(page.getByTestId('toolbar-home')).toBeVisible();
    await expect(page.getByTestId('session-loading')).toHaveCount(0);
  },
);

test(
  'a stored token of an unknown session shows the state session gone',
  { tag: '@react' },
  async ({ page }) => {
    const key = `planningpoker.session.${UNKNOWN_SESSION_ID}`;
    await page.addInitScript(
      ([storageKey]) =>
        sessionStorage.setItem(storageKey, JSON.stringify({ participantId: 'p', token: 't' })),
      [key],
    );

    await page.goto(`/session/${UNKNOWN_SESSION_ID}`);

    const gone = page.getByTestId('session-gone');
    await expect(gone).toHaveAttribute('role', 'alert');
    await expect(gone).toContainText('Diese Sitzung ist abgelaufen oder existiert nicht.');
    await expect(page.getByTestId('session-gone-home')).toHaveText('Zur Startseite');
    await expect(page.getByTestId('session-loading')).toHaveCount(0);
    await expect(page.getByTestId('error-banner')).toHaveCount(0);
    expect(await page.evaluate((storageKey) => sessionStorage.getItem(storageKey), key)).toBeNull();
  },
);
