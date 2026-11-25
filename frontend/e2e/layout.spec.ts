import { Browser, Locator, Page, expect, test } from '@playwright/test';
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
  const main = await page.getByTestId('room-main').boundingBox();
  const side = await page.getByTestId('room-side').boundingBox();
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
  const link = (await anna.getByTestId('share-link-developer').textContent()) ?? '';
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

  test('the side column of the session page is 340 px wide', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-name').fill('Anna');
    await page.getByTestId('create-project').fill('1234');
    await page.getByTestId('create-issue').fill('42');
    await page.getByTestId('create-submit').click();
    await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
    await expect(page.getByTestId('share-link-developer')).toBeVisible();

    const side = await page.getByTestId('room-side').boundingBox();
    expect(side?.width).toBe(340);
    await expectNoHorizontalScroll(page);
  });
});

async function openLongIssue(
  anna: Page,
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<Page> {
  await anna.setViewportSize(viewport);
  await anna.goto('/');
  await anna.getByTestId('create-name').fill('Anna');
  await anna.getByTestId('create-project').fill('1234');
  await anna.getByTestId('create-issue').fill('45');
  await anna.getByTestId('create-submit').click();
  await expect(anna).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await anna.getByTestId('share-link-developer').textContent()) ?? '';
  const ben = await (await browser.newContext({ viewport })).newPage();
  await ben.goto(link);
  await ben.getByTestId('join-name').fill('Ben');
  await ben.getByTestId('join-submit').click();
  await expect(ben.getByTestId('session-role')).toHaveText('Entwickler');
  await expect(anna.getByTestId('issue-preview-iid')).toHaveText('#45');
  await anna.getByTestId('issue-release').click();
  for (const page of [anna, ben]) {
    await expect(page.getByTestId('active-issue-title')).toHaveText('Monatsexport');
  }
  return ben;
}

async function box(locator: Locator): Promise<{ top: number; bottom: number }> {
  const found = await locator.boundingBox();
  expect(found).not.toBeNull();
  return { top: found!.y, bottom: found!.y + found!.height };
}

async function expectFooterInWindowAndLastLineReachable(page: Page): Promise<void> {
  const height = page.viewportSize()!.height;
  const footer = await box(page.getByTestId('round-footer'));
  expect(footer.top).toBeGreaterThanOrEqual(0);
  expect(footer.bottom).toBeLessThanOrEqual(height + 0.5);

  const expand = page.getByTestId('active-issue-expand');
  if (await expand.isVisible()) {
    await expand.click();
    await expect(page.getByTestId('active-issue-collapse')).toBeVisible();
  }
  const scroll = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('[data-testid="room-main"]')!;
    return {
      page: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      main: main.scrollHeight - main.clientHeight,
      overflow: getComputedStyle(main).overflowY,
    };
  });
  expect(scroll.page, JSON.stringify(scroll)).toBeLessThanOrEqual(0);
  expect(scroll.main, JSON.stringify(scroll)).toBeGreaterThan(0);
  expect(scroll.overflow).toBe('auto');
  const lastLine = page
    .getByTestId('active-issue-description')
    .getByText('Letzte Zeile der Beschreibung.');
  await lastLine.scrollIntoViewIfNeeded();
  const line = await box(lastLine);
  const main = await box(page.getByTestId('room-main'));
  expect(line.top).toBeGreaterThanOrEqual(main.top);
  expect(line.bottom).toBeLessThanOrEqual(footer.top + 0.5);
  expect((await box(page.getByTestId('round-footer'))).top).toBe(footer.top);
}

test.describe('scroll bar', () => {
  test('the main content keeps its width at 1440 x 900 when a scroll bar appears', async ({
    page: anna,
    browser,
  }) => {
    const ben = await openLongIssue(anna, browser, { width: 1440, height: 900 });
    await startVoting(anna);
    await ben.getByTestId('card-deck').getByTestId('card-5').click();
    await expect(anna.getByTestId('all-voted-hint')).toBeVisible();
    await anna.getByTestId('round-reveal').click();
    await expect(ben.getByTestId('result-waiting')).toBeVisible();

    const main = ben.getByTestId('room-main');
    const measure = (): Promise<{ client: number; scroll: number; issue: number }> =>
      main.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollHeight - node.clientHeight,
        issue: node.querySelector('[data-testid="active-issue"]')!.getBoundingClientRect().width,
      }));
    const before = await measure();
    expect(before.scroll, JSON.stringify(before)).toBeLessThanOrEqual(0);

    await ben.getByTestId('active-issue-expand').click();
    await expect(ben.getByTestId('active-issue-collapse')).toBeVisible();
    const after = await measure();

    expect(after.scroll, JSON.stringify(after)).toBeGreaterThan(0);
    expect(after.client).toBe(before.client);
    expect(after.issue).toBe(before.issue);
  });
});

test.describe('footer', () => {
  test('the footer stays in the window at 1440 x 900 with a long issue description', async ({
    page: anna,
    browser,
  }) => {
    const ben = await openLongIssue(anna, browser, { width: 1440, height: 900 });
    const everybody = [anna, ben];

    await expect(ben.getByTestId('card-deck-locked')).toBeVisible();
    await expect(anna.getByTestId('round-start')).toBeVisible();
    for (const page of everybody) {
      await expectFooterInWindowAndLastLineReachable(page);
    }

    await startVoting(anna);
    await expect(ben.getByTestId('card-deck')).toBeVisible();
    await expect(anna.getByTestId('round-reveal')).toBeVisible();
    for (const page of everybody) {
      await expectFooterInWindowAndLastLineReachable(page);
    }

    await ben.getByTestId('card-deck').getByTestId('card-5').click();
    await expect(anna.getByTestId('all-voted-hint')).toBeVisible();
    await anna.getByTestId('round-reveal').click();
    await expect(ben.getByTestId('result-waiting')).toBeVisible();
    await expect(anna.getByTestId('result-accept')).toBeVisible();
    for (const page of everybody) {
      await expectFooterInWindowAndLastLineReachable(page);
    }
  });

  test('the footer sticks to the bottom at 375 x 667 and the deck scrolls sideways', async ({
    page: anna,
    browser,
  }) => {
    const viewport = { width: 375, height: 667 };
    const ben = await openLongIssue(anna, browser, viewport);
    await startVoting(anna);
    const deck = ben.getByTestId('card-deck');
    await expect(deck).toBeVisible();

    const footer = await box(ben.getByTestId('round-footer'));
    expect(Math.abs(footer.bottom - viewport.height)).toBeLessThanOrEqual(1);
    const group = deck.getByRole('group', { name: 'Deine Karte' });
    const row = await group.evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      tops: Array.from(node.querySelectorAll('button')).map(
        (button) => button.getBoundingClientRect().top,
      ),
    }));
    expect(row.tops).toHaveLength(11);
    expect(new Set(row.tops).size).toBe(1);
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    await expectNoHorizontalScroll(ben);

    const coffee = deck.getByTestId('card-COFFEE');
    await coffee.click();
    await expect(coffee).toHaveAttribute('aria-pressed', 'true');
    const card = await coffee.boundingBox();
    const list = await group.boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(list!.x);
    expect(card!.x + card!.width).toBeLessThanOrEqual(list!.x + list!.width + 0.5);
    expect(card!.y + card!.height).toBeLessThanOrEqual(viewport.height);
    await expectNoHorizontalScroll(ben);
  });
});
