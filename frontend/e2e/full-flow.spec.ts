import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { countNotes } from './gitlab-double';
import { startVoting } from './helpers';

const PROJECT = '1234';
const CONFIRMED_ISSUE = 43;
const UNKNOWN_SESSION_ID = 'XYZ23456';

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function joinWithName(page: Page, name: string): Promise<void> {
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-submit').click();
  await expect(page.getByTestId('session-role')).toHaveText('Entwickler');
}

async function expectAll(pages: Page[], testId: string, text: string): Promise<void> {
  for (const page of pages) {
    await expect(page.getByTestId(testId)).toHaveText(text);
  }
}

function card(page: Page, value: string): Locator {
  return page.getByTestId('card-deck').getByTestId(`card-${value}`);
}

async function vote(page: Page, value: string): Promise<void> {
  await card(page, value).click();
  await expect(card(page, value)).toHaveAttribute('aria-pressed', 'true');
}

function issueResult(page: Page, iid: number): Locator {
  return page.getByTestId('issue-result').filter({ hasText: `#${iid} ` });
}

async function search(page: Page, text: string): Promise<void> {
  await page.getByTestId('issue-search-input').fill(text);
  await page.getByTestId('issue-search-submit').click();
}

async function playRound(anna: Page, ben: Page, cem: Page, everybody: Page[]): Promise<void> {
  await expectAll(everybody, 'session-phase', 'Diskussion');
  await startVoting(anna);
  await voteAndReveal(anna, ben, cem, everybody);
}

async function voteAndReveal(anna: Page, ben: Page, cem: Page, everybody: Page[]): Promise<void> {
  await expectAll(everybody, 'session-phase', 'Runde läuft');
  await expectAll(everybody, 'vote-counter', '0 von 2 haben geschätzt');
  await vote(ben, '5');
  await expectAll(everybody, 'vote-counter', '1 von 2 haben geschätzt');
  await expect(anna.getByTestId('all-voted-hint')).toHaveCount(0);
  await vote(cem, '8');
  await expectAll(everybody, 'vote-counter', '2 von 2 haben geschätzt');
  await expect(anna.getByTestId('all-voted-hint')).toBeVisible();
  await anna.getByTestId('round-reveal').click();
  await expectAll(everybody, 'session-phase', 'Runde aufgelöst');
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('three people estimate two issues and the scrum master writes the result to GitLab', async ({
  page: anna,
  browser,
}) => {
  const notesBefore = await countNotes(CONFIRMED_ISSUE);
  await anna.goto('/');
  await anna.getByTestId('create-name').fill('Anna');
  await anna.getByTestId('create-project').fill(PROJECT);
  await anna.getByTestId('create-issue').fill('42');
  await anna.getByTestId('create-submit').click();
  await expect(anna).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const sessionId = (await anna.getByTestId('session-id').textContent()) ?? '';
  const link = (await anna.getByTestId('share-link-developer').textContent()) ?? '';

  const ben = await newPage(browser);
  await ben.goto(link.replace(sessionId, sessionId.toLowerCase()));
  await expect(ben.getByTestId('toolbar-session-id')).toHaveText(sessionId);
  await expect(ben.getByTestId('toolbar-me')).toHaveCount(0);
  const joinBox = await ben.getByTestId('toolbar-session-id').boundingBox();
  await joinWithName(ben, 'Ben');
  await expect(ben.getByTestId('toolbar-session-id')).toHaveText(sessionId);
  await expect(ben.getByTestId('toolbar-me')).toHaveText(/Ben · Entwickler/);
  const roomBox = await ben.getByTestId('toolbar-session-id').boundingBox();
  expect(Math.abs(roomBox!.x - joinBox!.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(roomBox!.y - joinBox!.y)).toBeLessThanOrEqual(0.5);

  const cem = await newPage(browser);
  await cem.goto(link);
  await joinWithName(cem, 'Cem');
  expect(new URL(cem.url()).pathname).toBe(`/session/${sessionId}`);

  const everybody = [anna, ben, cem];
  await expectAll(everybody, 'session-participant-count', '3');
  await expectAll(everybody, 'session-phase', 'Wartet auf ein Issue');

  await search(anna, 'kein Treffer');
  await expect(anna.getByTestId('issue-results-empty')).toHaveText('Keine Issues gefunden');
  await expect(anna.getByTestId('issue-result')).toHaveCount(0);
  await search(anna, '');
  await expect(anna.getByTestId('issue-result')).toHaveCount(2);
  await expect(anna.getByTestId('issue-preview-iid')).toHaveText('#42');

  await anna.getByTestId('issue-release').click();
  await expectAll(everybody, 'active-issue-title', 'Login page');
  await expectAll(everybody, 'round-number', 'Runde 1');
  await playRound(anna, ben, cem, everybody);
  await expectAll(everybody, 'round-number', 'Runde 1');

  await anna.getByTestId('round-restart').click();
  await voteAndReveal(anna, ben, cem, everybody);
  await expectAll(everybody, 'round-number', 'Runde 2');

  await issueResult(anna, CONFIRMED_ISSUE).click();
  await anna.getByTestId('issue-release').click();
  await anna.getByTestId('switch-confirm').click();
  await expectAll(everybody, 'active-issue-title', 'Password reset');
  await expectAll(everybody, 'round-number', 'Runde 1');
  await playRound(anna, ben, cem, everybody);

  await anna.getByTestId('result-accept').click();
  const dialog = anna.getByTestId('confirm-dialog');
  await dialog.getByRole('radio', { name: '8', exact: true }).check();
  await dialog.getByTestId('confirm-submit').click();

  await expect(anna.getByTestId('confirm-success')).toBeVisible();
  await expectAll(everybody, 'session-phase', 'Wartet auf ein Issue');
  for (const page of everybody) {
    const latest = page.getByTestId('history-entry').first();
    await expect(latest.getByTestId('history-issue')).toHaveText('#43 Password reset');
    await expect(latest.getByTestId('history-final-card')).toHaveText('8');
  }
  await expect.poll(() => countNotes(CONFIRMED_ISSUE)).toBe(notesBefore + 1);
});

test('an unknown session with a stored token shows the gone state and drops the token', async ({
  page,
}) => {
  const key = `planningpoker.session.${UNKNOWN_SESSION_ID}`;
  await page.goto('/');
  await page.evaluate(
    ([storageKey]) =>
      sessionStorage.setItem(storageKey, JSON.stringify({ participantId: 'p', token: 't' })),
    [key],
  );

  await page.goto(`/session/${UNKNOWN_SESSION_ID}`);

  await expect(page.getByTestId('session-gone')).toContainText(
    'Diese Sitzung ist abgelaufen oder existiert nicht.',
  );
  await expect(page.getByTestId('session-loading')).toHaveCount(0);
  await expect(page.getByTestId('error-banner')).toHaveCount(0);
  expect(await page.evaluate((storageKey) => sessionStorage.getItem(storageKey), key)).toBeNull();

  await page.getByTestId('session-gone-home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('create-submit')).toBeVisible();
});
