import { Browser, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';

async function createSession(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return (await page.getByTestId('session-id').textContent()) ?? '';
}

async function copy(page: Page, target: 'developer' | 'viewer'): Promise<string> {
  await page.getByTestId(`copy-link-${target}`).click();
  await expect(page.getByTestId(`copy-link-${target}-done`)).toHaveText('Kopiert');
  return page.evaluate(() => navigator.clipboard.readText());
}

async function open(browser: Browser, link: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(link);
  return page;
}

async function join(page: Page, name: string): Promise<void> {
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
}

function row(page: Page, name: string) {
  return page
    .getByTestId('participant')
    .filter({ has: page.getByTestId('participant-name').getByText(name, { exact: true }) });
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('a viewer joins through the viewer link, sees the round without cards and is never counted', async ({
  page: anna,
  context,
  browser,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
  const sessionId = await createSession(anna);
  const developerLink = await copy(anna, 'developer');
  const viewerLink = await copy(anna, 'viewer');
  expect(developerLink).toBe(await anna.getByTestId('share-link-developer').textContent());
  expect(viewerLink).toBe(await anna.getByTestId('share-link-viewer').textContent());
  expect(viewerLink).toMatch(/&as=viewer$/);

  const ben = await open(browser, developerLink);
  await expect(ben.getByTestId('join-role-hint')).toBeVisible();
  await join(ben, 'Ben');
  await expect(ben.getByTestId('session-role')).toHaveText('Entwickler');

  const paula = await open(browser, viewerLink);
  await expect(paula.getByTestId('join-viewer-hint')).toHaveText(
    'Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.',
  );
  await join(paula, 'Paula');
  await expect(paula.getByTestId('session-role')).toHaveText('Zuschauer');
  await expect(paula.getByTestId('toolbar-me')).toHaveText('Paula · Zuschauer');
  await expect(paula.getByTestId('session-share')).toHaveCount(0);

  for (const view of [anna, ben, paula]) {
    await expect(view.getByTestId('session-participants')).toHaveText(
      '3 (1 Entwickler, 1 Zuschauer)',
    );
    await expect(row(view, 'Paula').getByTestId('participant-role')).toHaveText('Zuschauer');
  }
  await expect(anna.getByTestId('participant-name')).toHaveText(['Anna', 'Ben', 'Paula']);

  await anna.getByTestId('issue-release').click();
  await expect(paula.getByTestId('session-phase')).toHaveText('Diskussion');
  await expect(paula.getByTestId('viewer-hint')).toHaveText('Du schaust zu.');
  await expect(paula.getByTestId('card-deck-locked')).toHaveCount(0);
  await startVoting(anna);

  await expect(paula.getByTestId('session-phase')).toHaveText('Runde läuft');
  await expect(paula.getByTestId('active-issue')).toBeVisible();
  await expect(paula.getByTestId('viewer-hint')).toHaveText('Du schaust zu.');
  await expect(paula.getByTestId('card-deck')).toHaveCount(0);
  await expect(paula.getByTestId('seat-name')).toHaveText(['Ben']);
  await expect(anna.getByTestId('vote-counter')).toContainText('0 von 1');

  await ben.getByTestId('card-deck').getByTestId('card-5').click();

  await expect(anna.getByTestId('all-voted-hint')).toContainText(
    'Alle verbundenen Entwickler haben geschätzt.',
  );
  await expect(row(anna, 'Paula').getByTestId('participant-vote-status')).toHaveCount(0);
  await anna.getByTestId('round-reveal').click();

  for (const view of [anna, ben, paula]) {
    await expect(view.getByTestId('session-phase')).toHaveText('Runde aufgelöst');
    await expect(view.getByTestId('result-vote-name')).toHaveText(['Ben']);
    await expect(view.getByTestId('not-voted')).toHaveCount(0);
    await expect(row(view, 'Paula').getByTestId('participant-vote-status')).toHaveCount(0);
  }
  await expect(paula.getByTestId('result-waiting')).toBeVisible();
  await expect(paula.getByTestId('round-restart')).toHaveCount(0);
  expect(new URL(paula.url()).pathname).toBe(`/session/${sessionId}`);
});

test('a link without a code and a link with a changed code show the hints', async ({
  page: anna,
  browser,
}) => {
  const sessionId = await createSession(anna);
  const developerLink = (await anna.getByTestId('share-link-developer').textContent()) ?? '';

  const withoutCode = await open(browser, `/session/${sessionId}/join`);
  await expect(withoutCode.getByTestId('join-invite-missing')).toHaveText(
    'Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.',
  );
  await expect(withoutCode.getByTestId('join-form')).toHaveCount(0);

  const room = await open(browser, `/session/${sessionId}`);
  await expect(room).toHaveURL(`/session/${sessionId}/join`);
  await expect(room.getByTestId('join-invite-missing')).toBeVisible();

  const changed = new URL(developerLink);
  const code = changed.searchParams.get('invite') ?? '';
  changed.searchParams.set('invite', `${code.slice(1)}x`);
  const withChangedCode = await open(browser, changed.toString());
  await withChangedCode.getByTestId('join-name').fill('Cem');
  await withChangedCode.getByTestId('join-submit').click();
  await expect(withChangedCode.getByTestId('join-invite-invalid')).toHaveText(
    'Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.',
  );
  await expect(withChangedCode.getByTestId('join-form')).toHaveCount(0);
  await expect(withChangedCode.getByTestId('error-banner')).toHaveCount(0);
  await expect(anna.getByTestId('session-participant-count')).toHaveText('1');
});
