import { BrowserContext, Page, expect, test } from '@playwright/test';

const DEMO_HINT =
  'Demo-Modus: Projekte und Issues sind Beispiele. Ergebnisse gehen nicht an GitLab.';

async function answerConfig(context: BrowserContext, demo: boolean): Promise<void> {
  await context.route('**/api/config', (route) =>
    route.fulfill({ json: { rememberSessions: true, demo } }),
  );
}

async function createSession(page: Page): Promise<string> {
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill('1234');
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return page.url().split('/').pop() ?? '';
}

async function bottom(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox();
  return box === null ? Number.NaN : box.y + box.height;
}

async function top(page: Page, testId: string): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox();
  return box === null ? Number.NaN : box.y;
}

test('in demo mode the hint stands under the toolbar on the start page, in the room and on the join page', async ({
  context,
  page,
}) => {
  await answerConfig(context, true);
  await page.goto('/');

  const hint = page.getByTestId('demo-hint');
  await expect(hint).toHaveText(DEMO_HINT);
  await expect(hint).toHaveAttribute('role', 'status');
  expect(await top(page, 'demo-hint')).toBeGreaterThanOrEqual(await bottom(page, 'toolbar'));
  expect(await bottom(page, 'demo-hint')).toBeLessThanOrEqual(await top(page, 'create-name'));

  const sessionId = await createSession(page);
  await expect(page.getByTestId('issue-panel')).toBeVisible();
  await expect(hint).toHaveText(DEMO_HINT);
  expect(await top(page, 'demo-hint')).toBeGreaterThanOrEqual(await bottom(page, 'toolbar'));
  expect(await bottom(page, 'demo-hint')).toBeLessThanOrEqual(await top(page, 'issue-panel'));

  const join = await context.newPage();
  await join.goto(`/session/${sessionId}/join`);
  await expect(join.getByTestId('toolbar-session-id')).toHaveText(sessionId);
  await expect(join.getByTestId('demo-hint')).toHaveText(DEMO_HINT);
});

test('without demo mode there is no hint on the start page and in the room', async ({
  context,
  page,
}) => {
  await answerConfig(context, false);
  await page.goto('/');
  await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
  await expect(page.getByTestId('demo-hint')).toHaveCount(0);

  await createSession(page);
  await expect(page.getByTestId('issue-panel')).toBeVisible();
  await expect(page.getByTestId('demo-hint')).toHaveCount(0);
});

test('the backend with a GitLab token answers demo false and the page shows no hint', async ({
  page,
  request,
}) => {
  const config = await request.get('/api/config');
  expect(await config.json()).toEqual({ rememberSessions: true, demo: false });

  await page.goto('/');
  await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
  await expect(page.getByTestId('demo-hint')).toHaveCount(0);
});

test('when GET /api/config fails there is no hint', async ({ context, page }) => {
  await context.route('**/api/config', (route) => route.fulfill({ status: 503, body: 'down' }));
  await page.goto('/');

  await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
  await expect(page.getByTestId('demo-hint')).toHaveCount(0);
});
