import { BrowserContext, Page, expect, test } from '@playwright/test';

const RECENT_KEY = 'planningpoker.recent-sessions';

async function createSession(
  page: Page,
  values: { name?: string; project: string; issue?: string },
): Promise<string> {
  if (values.name !== undefined) {
    await page.getByTestId('create-name').fill(values.name);
  }
  await page.getByTestId('create-project').fill(values.project);
  await page.getByTestId('create-issue').fill(values.issue ?? '');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return page.url().split('/').pop() ?? '';
}

async function reopen(context: BrowserContext, page: Page): Promise<Page> {
  await page.close();
  const next = await context.newPage();
  await next.goto('/');
  return next;
}

function row(page: Page, sessionId: string) {
  return page
    .getByTestId('recent-session')
    .filter({ has: page.getByTestId('recent-session-id').getByText(sessionId, { exact: true }) });
}

test('the scrum master returns to the session from the start page after the tab is closed', async ({
  context,
  page,
}) => {
  await page.goto('/');
  const sessionId = await createSession(page, { name: 'Anna', project: '1234', issue: '42' });
  await expect(page.getByTestId('issue-panel')).toBeVisible();

  const start = await reopen(context, page);
  const entry = row(start, sessionId);
  await expect(start.getByTestId('recent-sessions')).toBeVisible();
  await expect(entry.getByTestId('recent-session-project')).toHaveText('Planning Poker Test');
  await expect(entry.getByTestId('recent-session-issue')).toHaveText('Kein Issue aktiv');
  await expect(entry.getByTestId('recent-session-role')).toHaveText('Scrum Master');
  await expect(entry.getByTestId('recent-session-name')).toHaveText('Anna');

  await entry.getByRole('link').click();
  await expect(start).toHaveURL((url) => url.pathname === `/session/${sessionId}`);
  await expect(start.getByTestId('issue-panel')).toBeVisible();
  await expect(start.getByTestId('toolbar-me')).toHaveText('Anna · Scrum Master');
});

test('a developer returns to the session from the start page after the tab is closed', async ({
  browser,
  page,
}) => {
  await page.goto('/');
  const sessionId = await createSession(page, { name: 'Anna', project: '1234', issue: '42' });

  const developerContext = await browser.newContext();
  const developer = await developerContext.newPage();
  await developer.goto(`/session/${sessionId}/join`);
  await developer.getByTestId('join-name').fill('Ben');
  await developer.getByTestId('join-submit').click();
  await expect(developer.getByTestId('lobby-waiting')).toBeVisible();

  const start = await reopen(developerContext, developer);
  const entry = row(start, sessionId);
  await expect(entry.getByTestId('recent-session-role')).toHaveText('Entwickler');
  await expect(entry.getByTestId('recent-session-name')).toHaveText('Ben');

  await entry.getByRole('link').click();
  await expect(start.getByTestId('lobby-waiting')).toBeVisible();
  await expect(start.getByTestId('toolbar-me')).toHaveText('Ben · Entwickler');
  await developerContext.close();
});

test('Neue Sitzung leads to the prefilled start page and both sessions stand in the list', async ({
  page,
}) => {
  await page.goto('/');
  const first = await createSession(page, { name: 'Anna', project: '1234', issue: '42' });

  await page.getByTestId('new-session').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('create-name')).toHaveValue('Anna');
  await expect(page.getByTestId('create-project')).toHaveValue('1234');
  await expect(row(page, first)).toBeVisible();

  const second = await createSession(page, { project: '5678' });
  expect(second).not.toBe(first);
  await expect(page.getByTestId('new-session')).toBeVisible();

  await page.getByTestId('toolbar-home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('recent-session-id')).toHaveText([second, first]);
  await expect(row(page, second).getByTestId('recent-session-project')).toHaveText(
    'Release Notes Test',
  );
  await expect(row(page, first).getByTestId('recent-session-project')).toHaveText(
    'Planning Poker Test',
  );
});

test('a developer sees no Neue Sitzung in the room', async ({ browser, page }) => {
  await page.goto('/');
  const sessionId = await createSession(page, { name: 'Anna', project: '1234', issue: '42' });

  const developerContext = await browser.newContext();
  const developer = await developerContext.newPage();
  await developer.goto(`/session/${sessionId}/join`);
  await developer.getByTestId('join-name').fill('Ben');
  await developer.getByTestId('join-submit').click();
  await expect(developer.getByTestId('lobby-waiting')).toBeVisible();
  await expect(developer.getByTestId('session-share')).toBeVisible();
  await expect(developer.getByTestId('new-session')).toHaveCount(0);
  await expect(developer.getByTestId('toolbar-home')).toHaveAttribute('href', '/');
  await developerContext.close();
});

test('with the feature switched off the browser keeps no list', async ({ context, page }) => {
  await context.route('**/api/config', (route) =>
    route.fulfill({ json: { rememberSessions: false } }),
  );
  await page.goto('/');
  await createSession(page, { name: 'Anna', project: '1234', issue: '42' });
  await expect(page.getByTestId('issue-panel')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), RECENT_KEY)).toBeNull();

  const start = await reopen(context, page);
  await expect(start.getByTestId('health-status')).toHaveText('Backend erreichbar');
  await expect(start.getByTestId('recent-sessions')).toHaveCount(0);
  expect(await start.evaluate((key) => localStorage.getItem(key), RECENT_KEY)).toBeNull();
});
