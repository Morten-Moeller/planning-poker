import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

interface Room {
  anna: Page;
  ben: Page;
}

async function openRoom(page: Page, browser: Browser): Promise<Room> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';

  const ben = await (await browser.newContext()).newPage();
  await ben.goto(link);
  await ben.getByTestId('join-name').fill('Ben');
  await ben.getByTestId('join-submit').click();
  await expect(ben.getByTestId('session-role')).toHaveText('Entwickler');
  return { anna: page, ben };
}

function room(page: Page): Locator {
  return page.locator('app-session-page .room');
}

async function motif(page: Page): Promise<string | null> {
  return room(page).getAttribute('data-motif');
}

async function expectPhase(pages: Page[], phase: string): Promise<void> {
  for (const page of pages) {
    await expect(page.getByTestId('session-phase')).toHaveText(phase);
  }
}

async function playRound({ anna, ben }: Room): Promise<void> {
  await startVoting(anna);
  await expectPhase([ben], 'Runde läuft');
  await ben.getByTestId('card-deck').getByTestId('card-5').click();
  await expect(anna.getByTestId('all-voted-hint')).toBeVisible();
  await anna.getByTestId('round-reveal').click();
  await expectPhase([anna, ben], 'Runde aufgelöst');
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('both roles see the same motif in a round and a new one after Neue Runde', async ({
  page,
  browser,
}) => {
  const { anna, ben } = await openRoom(page, browser);
  for (const view of [anna, ben]) {
    await expect(room(view)).toHaveAttribute('data-motif', '0');
    await expect(view.getByTestId('toolbar-motif')).toBeVisible();
  }

  await anna.getByTestId('issue-release').click();
  await expectPhase([anna, ben], 'Diskussion');
  await playRound({ anna, ben });

  const first = await motif(anna);
  expect(first).toMatch(/^[0-4]$/);
  await expect(room(ben)).toHaveAttribute('data-motif', first!);

  await anna.getByTestId('round-restart').click();
  await expectPhase([anna, ben], 'Diskussion');
  await expect(room(anna)).not.toHaveAttribute('data-motif', first!);
  const second = await motif(anna);
  expect(second).toMatch(/^[0-4]$/);
  await expect(room(ben)).toHaveAttribute('data-motif', second!);
});

test('a developer sees the last result in the lobby until the next release', async ({
  page,
  browser,
}) => {
  const { anna, ben } = await openRoom(page, browser);
  await expect(ben.getByTestId('last-result')).toHaveCount(0);

  await anna.getByTestId('issue-release').click();
  await expectPhase([anna, ben], 'Diskussion');
  await playRound({ anna, ben });
  await anna.getByTestId('result-accept').click();
  const dialog = anna.getByTestId('confirm-dialog');
  await dialog.getByRole('radio', { name: '5', exact: true }).check();
  await dialog.getByTestId('confirm-submit').click();
  await expectPhase([anna, ben], 'Wartet auf ein Issue');

  const last = ben.getByTestId('last-result');
  await expect(last).toBeVisible();
  await expect(last.getByTestId('last-result-final-card')).toHaveText('5');
  await expect(last.getByTestId('last-result-issue')).toHaveText('#42 Login page');
  await expect(last.getByTestId('last-result-round')).toHaveText('Runde 1');
  await expect(last.getByTestId('last-result-cards')).toHaveText('5');
  await expect(ben.getByTestId('lobby-waiting-title')).toHaveText(
    'Das Ergebnis ist übernommen. Warten, bis der Scrum Master das nächste Issue freigibt.',
  );
  await expect(anna.getByTestId('last-result')).toHaveCount(0);

  await anna.getByTestId('issue-result').filter({ hasText: '#43 ' }).click();
  await anna.getByTestId('issue-release').click();
  await expectPhase([anna, ben], 'Diskussion');
  await expect(ben.getByTestId('last-result')).toHaveCount(0);
  await expect(anna.getByTestId('last-result')).toHaveCount(0);
});
