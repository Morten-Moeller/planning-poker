import { Browser, Page, expect, test } from '@playwright/test';

const PROJECT = '1234';
const ISSUE = '42';
const MISSING_ISSUE = '404';
const FORBIDDEN_ISSUE = '403';
const SESSION_ID = /^[A-HJ-KM-NP-Z2-9]{8}$/;

async function createSession(page: Page, name = 'Anna', issue = ISSUE): Promise<void> {
  await page.goto('/');
  await page.getByTestId('create-name').fill(name);
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
}

async function createdSessionId(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const sessionId = (await page.getByTestId('share-session-id').textContent()) ?? '';
  expect(sessionId).toMatch(SESSION_ID);
  return sessionId;
}

async function joinInNewContext(browser: Browser, url: string, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-submit').click();
  return page;
}

test('blocks an incomplete create form and keeps the start page', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('create-submit').click();

  await expect(page.getByTestId('create-name-error')).toHaveText('Bitte einen Namen eingeben');
  await expect(page.getByTestId('create-project-error')).toBeVisible();
  await expect(page.getByTestId('create-issue-error')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('creates a session and opens the room as scrum master with the share block', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });

  await createSession(page);
  const sessionId = await createdSessionId(page);

  await expect(page.getByTestId('session-role')).toHaveText('Scrum Master');
  const link = `${baseURL}/session/${sessionId}/join`;
  await expect(page.getByTestId('session-share')).toBeVisible();
  await expect(page.getByTestId('share-link')).toHaveText(link);

  await page.getByTestId('copy-link').click();
  await expect(page.getByTestId('copy-link-done')).toHaveText('Kopiert');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

  await page.getByTestId('copy-session-id').click();
  await expect(page.getByTestId('copy-session-id-done')).toHaveText('Kopiert');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(sessionId);
});

test('a developer joins through the link in a second browser context', async ({
  page,
  browser,
}) => {
  await createSession(page);
  await createdSessionId(page);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';

  const developer = await joinInNewContext(browser, link, 'Ben');

  await expect(developer.getByTestId('session-role')).toHaveText('Entwickler');
  await expect(developer.getByTestId('session-participant-count')).toHaveText('2');
  await expect(page.getByTestId('session-participant-count')).toHaveText('2');
  await developer.context().close();
});

test('a developer joins through the session id typed in lower case on the start page', async ({
  page,
  browser,
}) => {
  await createSession(page);
  const sessionId = await createdSessionId(page);
  const developer = await (await browser.newContext()).newPage();

  await developer.goto('/');
  await developer.getByTestId('join-session-id-input').pressSequentially(sessionId.toLowerCase());
  await expect(developer.getByTestId('join-session-id-input')).toHaveValue(sessionId);
  await developer.getByTestId('join-session-id-submit').click();

  await expect(developer).toHaveURL(`/session/${sessionId}/join`);
  await expect(developer.getByTestId('join-session-id')).toHaveText(sessionId);
  await developer.getByTestId('join-name').fill('Cem');
  await developer.getByTestId('join-submit').click();
  await expect(developer.getByTestId('session-role')).toHaveText('Entwickler');
  await developer.context().close();
});

test('an unknown issue shows the message at the form and creates no session', async ({ page }) => {
  await createSession(page, 'Anna', MISSING_ISSUE);

  await expect(page.getByTestId('create-error')).toHaveText(
    'Das Issue wurde im GitLab-Projekt nicht gefunden.',
  );
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('create-name')).toHaveValue('Anna');
  await expect(page.getByTestId('create-project')).toHaveValue(PROJECT);
  await expect(page.getByTestId('create-issue')).toHaveValue(MISSING_ISSUE);
  await expect(page.getByTestId('error-banner')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) => key.startsWith('planningpoker.session.')),
    ),
  ).toEqual([]);
});

test('an issue that GitLab refuses shows the access denied text at the form', async ({ page }) => {
  await createSession(page, 'Anna', FORBIDDEN_ISSUE);

  await expect(page.getByTestId('create-error')).toHaveText(
    'GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.',
  );
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('create-issue')).toHaveValue(FORBIDDEN_ISSUE);
  await expect(page.getByTestId('error-banner')).toHaveCount(0);
});

test('a taken name shows the message on the join page', async ({ page, browser }) => {
  await createSession(page);
  await createdSessionId(page);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';

  const developer = await joinInNewContext(browser, link, 'anna');

  await expect(developer.getByTestId('join-error')).toHaveText(
    'Der Name ist in dieser Sitzung schon vergeben.',
  );
  await expect(developer).toHaveURL(/\/join$/);
  await developer.context().close();
});

test('an unknown session id replaces the join form with the state session not found', async ({
  page,
}) => {
  await page.goto('/session/ZZZZ2222/join');
  await page.getByTestId('join-name').fill('Ben');
  await page.getByTestId('join-submit').click();

  await expect(page.getByTestId('join-not-found')).toContainText('Sitzung nicht gefunden');
  await expect(page.getByTestId('join-not-found')).toContainText(
    'Der Link ist abgelaufen oder falsch.',
  );
  await expect(page.getByTestId('join-form')).toHaveCount(0);
  await expect(page).toHaveURL(/\/session\/ZZZZ2222\/join$/);

  await page.getByTestId('join-not-found-home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('create-form')).toBeVisible();
});

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(size.scrollWidth, JSON.stringify(size)).toBeLessThanOrEqual(size.clientWidth);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`at 375 px in ${colorScheme}`, () => {
    test.use({ viewport: { width: 375, height: 812 }, colorScheme });

    test('the start page stacks the panels and the join page fits the width', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');

      const create = await page.getByTestId('create-form').boundingBox();
      const join = await page.getByTestId('join-form').boundingBox();
      expect(create).not.toBeNull();
      expect(join).not.toBeNull();
      expect(join!.y).toBeGreaterThanOrEqual(create!.y + create!.height);
      expect(Math.abs(join!.x - create!.x)).toBeLessThan(1);
      await expectNoHorizontalScroll(page);

      await page.getByTestId('join-session-id-input').fill('K7P2QX');
      await page.getByTestId('join-session-id-submit').click();
      await expect(page.getByTestId('join-session-id-error')).toHaveText(
        'Die Session-ID hat 8 Zeichen (6 eingegeben)',
      );
      await expectNoHorizontalScroll(page);

      await page.goto('/session/K7P2QX9M/join');
      await expect(page.getByTestId('join-session-id')).toHaveText('K7P2QX9M');
      await expect(page.getByTestId('join-form')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
}
