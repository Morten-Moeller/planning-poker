import { Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

async function fontSizes(button: Locator): Promise<{ symbol: number; label: number }> {
  return button.evaluate((element) => {
    const symbol = element.querySelector('.app-symbol');
    if (!symbol) {
      throw new Error('no symbol');
    }
    return {
      symbol: parseFloat(getComputedStyle(symbol).fontSize),
      label: parseFloat(getComputedStyle(symbol.parentElement!).fontSize),
    };
  });
}

async function expectSymbolScale(button: Locator): Promise<void> {
  const sizes = await fontSizes(button);
  expect(Math.abs(sizes.symbol - sizes.label * 1.25)).toBeLessThanOrEqual(0.5);
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('the symbols in Kopieren and Erneut schätzen are 1.25 times the label', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill('1234');
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);

  await expectSymbolScale(page.getByTestId('copy-link-developer'));

  const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';
  const ben: Page = await (await browser.newContext()).newPage();
  await ben.goto(link);
  await ben.getByTestId('join-name').fill('Ben');
  await ben.getByTestId('join-submit').click();
  await expect(page.getByTestId('participant')).toHaveCount(2);

  await page.getByTestId('issue-release').click();
  await startVoting(page);
  const card = ben.getByTestId('card-deck').getByTestId('card-5');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('round-reveal').click();
  await expect(page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');

  await expectSymbolScale(page.getByTestId('round-restart'));
});
