import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

type Motion = 'reduce' | 'no-preference';

async function createSession(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return (await page.getByTestId('share-link-developer').textContent()) ?? '';
}

async function join(browser: Browser, link: string, reducedMotion: Motion): Promise<Page> {
  const page = await (await browser.newContext({ reducedMotion })).newPage();
  await page.goto(link);
  await page.getByTestId('join-name').fill('Ben');
  await page.getByTestId('join-submit').click();
  await expect(page.getByTestId('session-role')).toHaveText('Entwickler');
  return page;
}

async function discussion(
  scrumMaster: Page,
  browser: Browser,
  reducedMotion: Motion,
): Promise<Page> {
  const link = await createSession(scrumMaster);
  const developer = await join(browser, link, reducedMotion);
  await expect(scrumMaster.getByTestId('participant')).toHaveCount(2);
  await scrumMaster.getByTestId('issue-release').click();
  await expect(developer.getByTestId('card-deck-locked')).toBeVisible();
  return developer;
}

function cursor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).cursor);
}

function unlockIndexes(cards: Locator): Promise<(string | null)[]> {
  return cards.evaluateAll((nodes) =>
    nodes.map((node) =>
      node.hasAttribute('data-unlock')
        ? (node as HTMLElement).style.getPropertyValue('--unlock-index')
        : null,
    ),
  );
}

function running(cards: Locator): Promise<number> {
  return cards.evaluateAll(
    (nodes) => nodes.flatMap((node) => node.getAnimations({ subtree: true })).length,
  );
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test(
  'locked cards show the not-allowed cursor and open cards the pointer',
  { tag: '@react' },
  async ({ page, browser }) => {
    const developer = await discussion(page, browser, 'no-preference');
    const locked = developer.getByTestId('card-deck-locked').getByTestId('card-5');

    expect(await cursor(locked)).toBe('not-allowed');

    await startVoting(page);

    const open = developer.getByTestId('card-deck').getByTestId('card-5');
    await expect(open).toHaveAttribute('data-state', 'open');
    expect(await cursor(open)).toBe('pointer');
  },
);

test(
  'the cards unlock one after another from left to right when the voting starts',
  { tag: '@react' },
  async ({ page, browser }) => {
    const developer = await discussion(page, browser, 'no-preference');

    await startVoting(page);

    const cards = developer.getByTestId('card-deck').locator('button');
    await expect(cards).toHaveCount(11);
    await expect(cards.first()).toHaveAttribute('data-unlock', 'true');
    expect(await unlockIndexes(cards)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
    await expect.poll(() => running(cards), { timeout: 1_500 }).toBe(0);
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute('data-state', 'open');
      await expect(card).not.toHaveAttribute('aria-disabled');
    }
  },
);

test(
  'the cards open without the unlock animation under reduced motion',
  { tag: '@react' },
  async ({ page, browser }) => {
    const developer = await discussion(page, browser, 'reduce');

    await startVoting(page);

    const cards = developer.getByTestId('card-deck').locator('button');
    await expect(cards).toHaveCount(11);
    await expect(cards.first()).toHaveAttribute('data-state', 'open');
    expect(await unlockIndexes(cards)).toEqual(Array(11).fill(null));
  },
);
