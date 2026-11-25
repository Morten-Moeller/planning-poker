import { Browser, Page, expect, test } from '@playwright/test';
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

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

async function revealConsensus(page: Page, browser: Browser): Promise<Page[]> {
  const link = await createSession(page, '42');
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  const everybody = [page, ben, cem];
  await expect(page.getByTestId('participant')).toHaveCount(3);
  await page.getByTestId('issue-release').click();
  await startVoting(page);
  await expectPhase(everybody, 'Runde läuft');

  await choose(ben, '5');
  await choose(cem, '5');
  await expect(page.getByTestId('all-voted-hint')).toBeVisible();
  await page.getByTestId('round-reveal').click();
  await expectPhase(everybody, 'Runde aufgelöst');
  return everybody;
}

test(
  'every participant sees the consensus and the scrum master gets the card preselected',
  { tag: '@react' },
  async ({ page, browser }) => {
    const everybody = await revealConsensus(page, browser);

    for (const view of everybody) {
      await expect(view.getByTestId('consensus-hint')).toHaveText(
        'Konsens: Alle 2 abgegebenen Stimmen zeigen 5.',
      );
      await expect(view.getByTestId('consensus-confetti')).toBeVisible();
    }

    await page.getByTestId('result-accept').click();
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: '5', exact: true })).toBeChecked();
    await expect(dialog.getByTestId('confirm-submit')).toBeEnabled();
    await dialog.getByTestId('confirm-cancel').click();
    await expect(dialog).toHaveCount(0);
  },
);

test(
  'shows the consensus without confetti under reduced motion',
  { tag: '@react' },
  async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const everybody = await revealConsensus(page, browser);
    await everybody[1].emulateMedia({ reducedMotion: 'reduce' });

    await everybody[1].reload();
    for (const view of [page, everybody[1]]) {
      await expect(view.getByTestId('consensus-hint')).toBeVisible();
      await expect(view.getByTestId('consensus-confetti')).toHaveCount(0);
      await expect(view.getByTestId('result-vote-card')).toHaveCount(2);
      for (const card of await view.getByTestId('result-vote-card').all()) {
        await expect(card).toHaveCSS('animation-name', 'none');
      }
    }
    await expect(everybody[2].getByTestId('consensus-confetti')).toBeVisible();
    await expect(everybody[2].getByTestId('result-vote-card').first()).not.toHaveCSS(
      'animation-name',
      'none',
    );
  },
);

test(
  'every participant sees the developer who did not vote',
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

    await choose(ben, '5');
    await expect(page.getByTestId('vote-counter')).toContainText('1 von 2');
    await page.getByTestId('round-reveal').click();
    await expectPhase(everybody, 'Runde aufgelöst');

    for (const view of everybody) {
      await expect(view.getByTestId('not-voted')).toHaveText('Nicht geschätzt: Cem');
      await expect(view.getByTestId('not-voted-name')).toHaveText(['Cem']);
      await expect(view.getByTestId('result-vote-name')).toHaveText(['Ben']);
    }
  },
);
