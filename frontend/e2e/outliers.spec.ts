import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

async function createSession(page: Page, issue: string): Promise<string> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return (await page.getByTestId('share-link-developer').textContent()) ?? '';
}

async function join(browser: Browser, link: string, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(link);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-submit').click();
  await expect(page.getByTestId('session-role')).toHaveText('Entwickler');
  return page;
}

async function expectPhase(pages: Page[], phase: string): Promise<void> {
  for (const page of pages) {
    await expect(page.getByTestId('session-phase')).toHaveText(phase);
  }
}

async function choose(page: Page, value: string): Promise<void> {
  const card = page.getByTestId('card-deck').getByTestId(`card-${value}`);
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
}

function vote(page: Page, name: string): Locator {
  return page
    .getByTestId('round-result')
    .getByTestId('result-vote')
    .filter({ has: page.getByTestId('result-vote-name').getByText(name, { exact: true }) });
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test(
  'every participant sees the same outliers after the reveal',
  { tag: '@react' },
  async ({ page, browser }) => {
    const link = await createSession(page, '42');
    const ben = await join(browser, link, 'Ben');
    const cem = await join(browser, link, 'Cem');
    const everybody = [page, ben, cem];
    await expect(page.getByTestId('participant')).toHaveCount(3);
    await page.getByTestId('issue-release').click();
    await startVoting(page);
    await expectPhase(everybody, 'Runde läuft');

    await choose(ben, '1');
    await choose(cem, '13');
    await expect(page.getByTestId('all-voted-hint')).toBeVisible();
    await page.getByTestId('round-reveal').click();

    await expectPhase(everybody, 'Runde aufgelöst');
    for (const view of everybody) {
      await expect(view.getByTestId('outlier-hint')).toBeVisible();
      await expect(view.getByTestId('outlier-hint')).toHaveText(
        'Niedrigste und höchste Schätzung liegen weit auseinander.',
      );
      await expect(view.getByTestId('result-vote-outlier')).toHaveCount(2);
      for (const name of ['Ben', 'Cem']) {
        await expect(vote(view, name).getByTestId('result-vote-outlier')).toHaveText('Ausreißer');
      }
    }
  },
);
