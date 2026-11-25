import { Browser, Page, expect, test } from '@playwright/test';

const PROJECT = '1234';
const SESSION_ID = /^[A-Z2-9]{8}$/;

async function token(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    name,
  );
}

async function rgb(page: Page, color: string): Promise<string> {
  return page.evaluate((value) => {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, color);
}

async function createSession(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return (await page.getByTestId('share-link-developer').textContent()) ?? '';
}

async function join(
  browser: Browser,
  link: string,
  name: string,
  viewport = { width: 1280, height: 800 },
): Promise<Page> {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto(link);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-submit').click();
  await expect(page.getByTestId('session-role')).toHaveText('Entwickler');
  return page;
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

const schemes = [
  { colorScheme: 'dark' as const, surface: '#282c34', primary: '#61afef', success: '#98c379' },
  { colorScheme: 'light' as const, surface: '#fafafa', primary: '#2f5fd0', success: '#3a7a39' },
];

for (const scheme of schemes) {
  test(
    `the start page uses the ${scheme.colorScheme} theme of the system`,
    { tag: '@react' },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme.colorScheme });
      await page.goto('/');
      await expect(page.getByTestId('theme-toggle')).toBeVisible();

      expect(await token(page, '--mat-sys-surface')).toBe(scheme.surface);
      expect(await token(page, '--mat-sys-primary')).toBe(scheme.primary);
      expect(await token(page, '--app-success')).toBe(scheme.success);
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(background).toBe(await rgb(page, scheme.surface));
    },
  );
}

test(
  'text uses IBM Plex Sans and the session id in the toolbar IBM Plex Mono',
  { tag: '@react' },
  async ({ page }) => {
    await createSession(page);

    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(body).toMatch(/^"?IBM Plex Sans"?/);
    const sessionId = page.getByTestId('toolbar-session-id');
    const mono = await sessionId.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(mono).toMatch(/^"?IBM Plex Mono"?/);
  },
);

test(
  'the toolbar shows the session id and name and role in the room only',
  { tag: '@react' },
  async ({ page, browser }) => {
    await page.goto('/');
    await expect(page.getByTestId('create-form')).toBeVisible();
    await expect(page.getByTestId('toolbar-session-id')).toHaveCount(0);
    await expect(page.getByTestId('toolbar-me')).toHaveCount(0);

    const link = await createSession(page);
    const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
    expect(sessionId).toMatch(SESSION_ID);
    await expect(page.getByTestId('toolbar-session-id')).toHaveText(sessionId);
    await expect(page.getByTestId('toolbar-me')).toHaveText('Anna · Scrum Master');

    const ben = await join(browser, link, 'Ben');
    await expect(ben.getByTestId('toolbar-session-id')).toHaveText(sessionId);
    await expect(ben.getByTestId('toolbar-me')).toHaveText('Ben · Entwickler');

    const small = await join(browser, link, 'Cem', { width: 375, height: 800 });
    await expect(small.getByTestId('toolbar-session-id')).toHaveText(sessionId);
    await expect(small.getByTestId('toolbar-me')).toBeHidden();
  },
);

test(
  'a button shows the focus ring for keyboard focus only',
  { tag: '@react' },
  async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
    const input = page.getByTestId('create-issue');
    const button = page.getByTestId('create-submit');
    const outline = () =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
    const primary = await rgb(page, await token(page, '--mat-sys-primary'));

    await input.click();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    expect(await outline()).toEqual({ style: 'solid', width: '3px', color: primary });

    await page.getByTestId('create-name').click();
    await button.click();
    await expect(button).toBeFocused();
    expect((await outline()).style).toBe('none');
  },
);

test('the page links the favicon in three formats and serves them', async ({ page, request }) => {
  await page.goto('/');

  const icons = await page.evaluate(() =>
    Array.from(
      document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]'),
    ).map((link) => ({
      rel: link.getAttribute('rel'),
      href: link.getAttribute('href'),
      type: link.getAttribute('type'),
      sizes: link.getAttribute('sizes'),
    })),
  );
  expect(icons).toEqual([
    { rel: 'icon', href: 'favicon.ico', type: null, sizes: '16x16 32x32 48x48' },
    { rel: 'icon', href: 'favicon.svg', type: 'image/svg+xml', sizes: null },
    { rel: 'apple-touch-icon', href: 'apple-touch-icon.png', type: null, sizes: '180x180' },
  ]);
  for (const path of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
