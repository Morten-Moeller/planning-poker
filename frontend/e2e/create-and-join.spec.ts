import { Browser, Page, expect, test } from '@playwright/test';

const PROJECT = '1234';
const ISSUE = '42';
const MISSING_ISSUE = '404';
const FORBIDDEN_ISSUE = '403';
const SESSION_ID = /^[A-HJ-KM-NP-Z2-9]{8}$/;
const INVITE = /^[A-Za-z0-9_-]{22,}$/;
const VIEWER_SUFFIX = '&as=viewer';

async function createSession(page: Page, name = 'Anna', issue = ISSUE): Promise<void> {
  await page.goto('/');
  await page.getByTestId('create-name').fill(name);
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
}

async function createdSessionId(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const sessionId = (await page.getByTestId('session-id').textContent()) ?? '';
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
  await expect(page.getByTestId('create-issue-error')).toHaveCount(0);
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
  await expect(page.getByTestId('session-share')).toBeVisible();
  const prefix = `${baseURL}/session/${sessionId}/join?invite=`;
  const developerLink = (await page.getByTestId('share-link-developer').textContent()) ?? '';
  const viewerLink = (await page.getByTestId('share-link-viewer').textContent()) ?? '';
  expect(developerLink.startsWith(prefix)).toBe(true);
  expect(developerLink.slice(prefix.length)).toMatch(INVITE);
  expect(viewerLink.startsWith(prefix)).toBe(true);
  expect(viewerLink.endsWith(VIEWER_SUFFIX)).toBe(true);
  expect(viewerLink.slice(prefix.length, -VIEWER_SUFFIX.length)).toMatch(INVITE);
  expect(viewerLink).not.toContain(developerLink.slice(prefix.length));
  await expect(page.getByTestId('share-session-id')).toHaveCount(0);

  await page.getByTestId('copy-link-developer').click();
  await expect(page.getByTestId('copy-link-developer-done')).toHaveText('Kopiert');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(developerLink);

  await page.getByTestId('copy-link-viewer').click();
  await expect(page.getByTestId('copy-link-viewer-done')).toHaveText('Kopiert');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(viewerLink);
});

test('a developer joins through the link in a second browser context', async ({
  page,
  browser,
}) => {
  await createSession(page);
  await createdSessionId(page);
  const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';

  const developer = await joinInNewContext(browser, link, 'Ben');

  await expect(developer.getByTestId('session-role')).toHaveText('Entwickler');
  await expect(developer.getByTestId('session-participant-count')).toHaveText('2');
  await expect(page.getByTestId('session-participant-count')).toHaveText('2');
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
  const link = (await page.getByTestId('share-link-developer').textContent()) ?? '';

  const developer = await joinInNewContext(browser, link, 'anna');

  await expect(developer.getByTestId('join-error')).toHaveText(
    'Der Name ist in dieser Sitzung schon vergeben.',
  );
  await expect(developer).toHaveURL(/\/join\?invite=/);
  await developer.context().close();
});

test('an unknown session id replaces the join form with the state session not found', async ({
  page,
}) => {
  await page.goto('/session/ZZZZ2222/join?invite=unknown-session-invite');
  await page.getByTestId('join-name').fill('Ben');
  await page.getByTestId('join-submit').click();

  await expect(page.getByTestId('join-not-found')).toContainText('Sitzung nicht gefunden');
  await expect(page.getByTestId('join-not-found')).toContainText(
    'Der Link ist abgelaufen oder falsch.',
  );
  await expect(page.getByTestId('join-form')).toHaveCount(0);
  await expect(page).toHaveURL(/\/session\/ZZZZ2222\/join\?invite=unknown-session-invite$/);

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

    test('the start page shows only the create form and the join page fits the width', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');

      await expect(page.getByTestId('create-form')).toBeVisible();
      await expect(page.getByTestId('join-form')).toHaveCount(0);
      await expect(page.getByTestId('join-session-id-input')).toHaveCount(0);
      await expectNoHorizontalScroll(page);

      await page.goto('/session/K7P2QX9M/join?invite=some-invite');
      await expect(page.getByTestId('toolbar-session-id')).toHaveText('K7P2QX9M');
      await expect(page.getByTestId('toolbar-motif')).toBeVisible();
      await expect(page.getByTestId('toolbar-me')).toHaveCount(0);
      await expect(page.getByTestId('join-session-id')).toHaveCount(0);
      await expect(page.getByTestId('join-form')).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
}
