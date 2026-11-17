import { Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const VIEWPORT = { width: 375, height: 800 };

test.use({ viewport: VIEWPORT });

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(size.scrollWidth, JSON.stringify(size)).toBeLessThanOrEqual(size.clientWidth);
}

async function expectSideUnderMain(page: Page): Promise<void> {
  const main = await page.locator('app-session-page .main').boundingBox();
  const side = await page.locator('app-session-page .side').boundingBox();
  expect(main).not.toBeNull();
  expect(side).not.toBeNull();
  expect(side!.y).toBeGreaterThanOrEqual(main!.y + main!.height - 1);
  expect(side!.width).toBeLessThanOrEqual(VIEWPORT.width);
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('the session page has no horizontal scroll bar at 375 px in every phase', async ({
  page: anna,
  browser,
}) => {
  await anna.goto('/');
  await anna.getByTestId('create-name').fill('Anna');
  await anna.getByTestId('create-project').fill('1234');
  await anna.getByTestId('create-issue').fill('42');
  await anna.getByTestId('create-submit').click();
  await expect(anna).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await anna.getByTestId('share-link').textContent()) ?? '';
  const ben = await (await browser.newContext({ viewport: VIEWPORT })).newPage();
  await ben.goto(link);
  await ben.getByTestId('join-name').fill('Ben');
  await ben.getByTestId('join-submit').click();
  await expect(ben.getByTestId('session-role')).toHaveText('Entwickler');
  const everybody = [anna, ben];

  await expect(anna.getByTestId('issue-result')).toHaveCount(2);
  for (const page of everybody) {
    await expect(page.getByTestId('session-phase')).toHaveText('Wartet auf ein Issue');
    await expectSideUnderMain(page);
    await expectNoHorizontalScroll(page);
  }

  await anna.getByTestId('issue-release').click();
  for (const page of everybody) {
    await expect(page.getByTestId('session-phase')).toHaveText('Diskussion');
    await expect(page.getByTestId('active-issue-title')).toHaveText('Login page');
  }
  await expect(ben.getByTestId('discussion-hint')).toBeVisible();
  await expect(anna.getByTestId('round-start')).toBeVisible();
  for (const page of everybody) {
    await expectNoHorizontalScroll(page);
  }

  await startVoting(anna);
  for (const page of everybody) {
    await expect(page.getByTestId('session-phase')).toHaveText('Runde läuft');
  }
  await expect(ben.getByTestId('card-deck')).toBeVisible();
  for (const page of everybody) {
    await expectNoHorizontalScroll(page);
  }

  await ben.getByTestId('card-deck').getByTestId('card-5').click();
  await expect(anna.getByTestId('all-voted-hint')).toBeVisible();
  await anna.getByTestId('round-reveal').click();
  for (const page of everybody) {
    await expect(page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(page.getByTestId('round-result')).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the side column of the session page is 320 px wide', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-name').fill('Anna');
    await page.getByTestId('create-project').fill('1234');
    await page.getByTestId('create-issue').fill('42');
    await page.getByTestId('create-submit').click();
    await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
    await expect(page.getByTestId('share-link')).toBeVisible();

    const side = await page.locator('app-session-page .side').boundingBox();
    expect(side?.width).toBe(320);
    await expectNoHorizontalScroll(page);
  });
});
