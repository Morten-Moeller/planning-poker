import { Locator, Page, expect, test } from '@playwright/test';

const PROJECT = '1234';

const SCHEMES = {
  light: { surface: '#fafafa', label: 'Dunkles Design', symbol: '🌙', pressed: 'false' },
  dark: { surface: '#282c34', label: 'Helles Design', symbol: '☀️', pressed: 'true' },
} as const;

const ACCENTS = {
  light: ['#2f5fd0', '#0a6f8f', '#3a7a39', '#9a2299', '#8a5f00'],
  dark: ['#61afef', '#56b6c2', '#98c379', '#c678dd', '#e5c07b'],
} as const;

type Scheme = keyof typeof SCHEMES;

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

async function token(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    name,
  );
}

async function accent(locator: Locator): Promise<string> {
  return locator.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--app-card-accent').trim(),
  );
}

async function background(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function expectScheme(page: Page, scheme: Scheme): Promise<void> {
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toHaveAttribute('aria-label', SCHEMES[scheme].label);
  await expect(toggle).toHaveAttribute('aria-pressed', SCHEMES[scheme].pressed);
  await expect(toggle).toHaveText(SCHEMES[scheme].symbol);
  expect(await token(page, '--mat-sys-surface')).toBe(SCHEMES[scheme].surface);
  expect(await background(page.locator('body'))).toBe(rgb(SCHEMES[scheme].surface));
}

const cases: { system: Scheme; other: Scheme }[] = [
  { system: 'light', other: 'dark' },
  { system: 'dark', other: 'light' },
];

for (const { system, other } of cases) {
  test(`with a ${system} system a click switches to ${other} and the choice stays after a reload`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: system });
    await page.goto('/');
    await expect(page.getByTestId('create-form')).toBeVisible();
    await expectScheme(page, system);

    await page.getByTestId('theme-toggle').click();
    await expectScheme(page, other);
    await expect(page.locator('html')).toHaveAttribute('data-theme', other);

    await page.reload();
    await expect(page.getByTestId('create-form')).toBeVisible();
    await expectScheme(page, other);
  });

  test(`with a ${system} system a click switches the card motif and the toolbar motif in the room`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: system });
    await page.goto('/');
    await page.getByTestId('create-name').fill('Anna');
    await page.getByTestId('create-project').fill(PROJECT);
    await page.getByTestId('create-issue').fill('42');
    await page.getByTestId('create-submit').click();
    await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
    const room = page.locator('app-session-page .room');
    await expect(room).toHaveAttribute('data-motif', /^[0-4]$/);
    const id = Number(await room.getAttribute('data-motif'));
    const motif = page.getByTestId('toolbar-motif');

    expect(await accent(room)).toBe(ACCENTS[system][id]);
    expect(await background(motif)).toBe(rgb(ACCENTS[system][id]));

    await page.getByTestId('theme-toggle').click();

    await expectScheme(page, other);
    expect(await accent(room)).toBe(ACCENTS[other][id]);
    expect(await background(motif)).toBe(rgb(ACCENTS[other][id]));
  });
}
