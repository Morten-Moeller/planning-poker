import { Browser, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';
const PIECES = 46;

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

async function revealConsensus(page: Page, browser: Browser): Promise<void> {
  const link = await createSession(page, '42');
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  await expect(page.getByTestId('participant')).toHaveCount(3);
  await page.getByTestId('issue-release').click();
  await startVoting(page);
  await choose(ben, '5');
  await choose(cem, '5');
  await expect(page.getByTestId('all-voted-hint')).toBeVisible();
  await page.getByTestId('round-reveal').click();
  await expect(page.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
}

test('the confetti falls as one rain with distinct delays and spread durations', async ({
  page,
  browser,
}) => {
  await revealConsensus(page, browser);
  const confetti = page.getByTestId('consensus-confetti');
  await expect(confetti).toBeVisible();
  await expect(confetti.locator('span')).toHaveCount(PIECES);

  const timing = await confetti.locator('span').evaluateAll((pieces) =>
    pieces.map((piece) => {
      const style = getComputedStyle(piece);
      return {
        delay: parseFloat(style.animationDelay),
        duration: parseFloat(style.animationDuration),
      };
    }),
  );
  const delays = timing.map((entry) => entry.delay);
  const durations = timing.map((entry) => entry.duration);

  expect(new Set(delays).size).toBe(PIECES);
  for (const delay of delays) {
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(1.3);
  }
  expect(Math.max(...durations) - Math.min(...durations)).toBeGreaterThanOrEqual(0.8);
});

test('the confetti falls over the height of its container', async ({ page, browser }) => {
  await revealConsensus(page, browser);
  const confetti = page.getByTestId('consensus-confetti');
  await expect(confetti).toBeVisible();
  await expect(confetti).toHaveCSS('container-type', 'size');

  const fall = await confetti
    .locator('span')
    .first()
    .evaluate((piece) => {
      const name = getComputedStyle(piece).animationName;
      const rules = Array.from(document.styleSheets)
        .filter((sheet) => !sheet.href || new URL(sheet.href).origin === location.origin)
        .flatMap((sheet) => Array.from(sheet.cssRules));
      const keyframes = rules.find(
        (rule): rule is CSSKeyframesRule => rule instanceof CSSKeyframesRule && rule.name === name,
      );
      return keyframes?.findRule('100%')?.cssText ?? '';
    });

  expect(fall).toContain('cqh');
});
