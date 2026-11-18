import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

const ACCENTS = {
  light: ['#2f5fd0', '#0a6f8f', '#3a7a39', '#9a2299', '#8a5f00'],
  dark: ['#61afef', '#56b6c2', '#98c379', '#c678dd', '#e5c07b'],
} as const;

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

async function accent(locator: Locator): Promise<string> {
  return locator.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--app-card-accent').trim(),
  );
}

async function background(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

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
  const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';

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

for (const scheme of ['light', 'dark'] as const) {
  test(`the motif colours of room, toolbar and join page are the same in the ${scheme} theme`, async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByTestId('create-name').fill('Anna');
    await page.getByTestId('create-project').fill(PROJECT);
    await page.getByTestId('create-issue').fill('42');
    await page.getByTestId('create-submit').click();
    await expect(room(page)).toHaveAttribute('data-motif', '0');
    expect(await accent(room(page))).toBe(ACCENTS[scheme][0]);
    expect(await background(page.getByTestId('toolbar-motif'))).toBe(rgb(ACCENTS[scheme][0]));

    const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';
    const ben = await (await browser.newContext({ colorScheme: scheme })).newPage();
    await ben.goto(link);
    const hand = ben.getByTestId('card-hand');
    const cards = hand.getByTestId('card-hand-card');
    await expect(cards).toHaveCount(5);
    for (const [index, hex] of ACCENTS[scheme].entries()) {
      expect(await accent(cards.nth(index))).toBe(hex);
      expect(await background(cards.nth(index))).toBe(rgb(hex));
    }
    await expect(ben.getByTestId('join-card-backs')).toHaveCount(0);
    await expect(ben.getByTestId('toolbar-motif')).toBeVisible();
    expect(
      await ben
        .getByTestId('toolbar-motif')
        .evaluate((element) => getComputedStyle(element).borderStyle),
    ).toBe('dashed');
    const joinHand = (await hand.boundingBox())!;
    const form = (await ben.getByTestId('join-form').boundingBox())!;
    expect(
      Math.abs(joinHand.x + joinHand.width / 2 - (form.x + form.width / 2)),
    ).toBeLessThanOrEqual(1);

    await ben.getByTestId('join-name').fill('Ben');
    await ben.getByTestId('join-submit').click();
    const lobbyHand = ben.getByTestId('lobby-waiting').getByTestId('card-hand');
    await expect(lobbyHand.getByTestId('card-hand-card')).toHaveCount(5);
    expect((await lobbyHand.boundingBox())!.width).toBeLessThan(joinHand.width);
    expect(await background(ben.getByTestId('toolbar-motif'))).toBe(rgb(ACCENTS[scheme][0]));
    await page.getByTestId('issue-release').click();
    await expectPhase([page, ben], 'Diskussion');
    await playRound({ anna: page, ben });
    const current = Number(await motif(page));
    for (const view of [page, ben]) {
      expect(await accent(room(view))).toBe(ACCENTS[scheme][current]);
      expect(await background(view.getByTestId('toolbar-motif'))).toBe(
        rgb(ACCENTS[scheme][current]),
      );
    }
  });
}

test('both roles see the same motif in a round and a new one after Erneut schätzen', async ({
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
  await expectPhase([anna, ben], 'Runde läuft');
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
