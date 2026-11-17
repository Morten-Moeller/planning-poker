import { Browser, Locator, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';
import { removeStubs, stubIssueWithFailingFirstNote, uniqueIssueIid } from './gitlab-double';

const PROJECT = '1234';

interface Snapshot {
  round: { number: number } | null;
}

interface View {
  page: Page;
  snapshots: Snapshot[];
}

function watch(page: Page): View {
  const view: View = { page, snapshots: [] };
  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => {
      const message = JSON.parse(payload.toString()) as { type: string; payload?: Snapshot };
      if (message.type === 'session.state' && message.payload !== undefined) {
        view.snapshots.push(message.payload);
      }
    });
  });
  return view;
}

async function createSession(page: Page, issue: string): Promise<{ anna: View; link: string }> {
  const anna = watch(page);
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';
  return { anna, link };
}

async function join(browser: Browser, link: string, name: string): Promise<View> {
  const view = watch(await (await browser.newContext()).newPage());
  await view.page.goto(link);
  await view.page.getByTestId('join-name').fill(name);
  await view.page.getByTestId('join-submit').click();
  await expect(view.page.getByTestId('session-role')).toHaveText('Entwickler');
  return view;
}

async function expectPhase(views: View[], phase: string): Promise<void> {
  for (const view of views) {
    await expect(view.page.getByTestId('session-phase')).toHaveText(phase);
  }
}

function card(view: View, value: string): Locator {
  return view.page.getByTestId('card-deck').getByTestId(`card-${value}`);
}

async function choose(view: View, value: string): Promise<void> {
  await card(view, value).click();
  await expect(card(view, value)).toHaveAttribute('aria-pressed', 'true');
}

async function playRound(anna: View, votes: [View, string][]): Promise<void> {
  await expectPhase([anna, ...votes.map(([view]) => view)], 'Runde läuft');
  for (const [view, value] of votes) {
    await choose(view, value);
  }
  await expect(anna.page.getByTestId('all-voted-hint')).toBeVisible();
  await anna.page.getByTestId('round-reveal').click();
  await expectPhase([anna, ...votes.map(([view]) => view)], 'Runde aufgelöst');
}

function result(view: View): Locator {
  return view.page.getByTestId('round-result');
}

async function texts(locator: Locator): Promise<string[]> {
  return (await locator.allTextContents()).map((text) => text.replace(/\s+/g, ' ').trim());
}

function voteStatus(view: View, name: string): Locator {
  return view.page
    .getByTestId('participant')
    .filter({ has: view.page.getByTestId('participant-name').getByText(name, { exact: true }) })
    .getByTestId('participant-vote-status');
}

async function openHistory(view: View): Promise<Locator> {
  const toggle = view.page.getByTestId('history-toggle');
  await toggle.focus();
  await view.page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  return view.page.getByTestId('history-entry');
}

function lastRoundNumber(view: View): number | null {
  return view.snapshots.at(-1)?.round?.number ?? null;
}

let stubs: string[] = [];

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
  await removeStubs(stubs);
  stubs = [];
});

test('everybody sees the same result, the scrum master starts a new round and confirms the result', async ({
  page,
  browser,
}) => {
  const { anna, link } = await createSession(page, '42');
  const ben = await join(browser, link, 'Ben');
  const cem = await join(browser, link, 'Cem');
  const everybody = [anna, ben, cem];
  await expect(anna.page.getByTestId('participant')).toHaveCount(3);
  await anna.page.getByTestId('issue-release').click();
  await startVoting(anna.page);

  await playRound(anna, [
    [ben, '5'],
    [cem, '8'],
  ]);

  for (const view of everybody) {
    expect(await texts(result(view).getByTestId('result-vote'))).toEqual(['Ben5', 'Cem8']);
    expect(await texts(result(view).getByTestId('result-count-card'))).toEqual(['5', '8']);
    expect(await texts(result(view).getByTestId('result-count-votes'))).toEqual([
      '1 Stimme',
      '1 Stimme',
    ]);
    await expect(result(view).getByTestId('result-average')).toHaveText('6,5');
    await expect(result(view).getByTestId('result-most-frequent')).toHaveText('5, 8');
    await expect(result(view)).toContainText('Durchschnitt (Orientierung)');
    await expect(result(view)).toContainText('Häufigste Werte (Orientierung)');
    await expect(result(view).locator('.facts button, .distribution button')).toHaveCount(0);
  }
  await expect(anna.page.getByTestId('round-restart')).toBeVisible();
  await expect(anna.page.getByTestId('result-accept')).toBeVisible();
  for (const developer of [ben, cem]) {
    await expect(developer.page.getByTestId('round-restart')).toHaveCount(0);
    await expect(developer.page.getByTestId('result-accept')).toHaveCount(0);
  }

  await anna.page.getByTestId('round-restart').click();

  await expectPhase(everybody, 'Diskussion');
  await startVoting(anna.page);
  await expectPhase(everybody, 'Runde läuft');
  for (const view of everybody) {
    await expect(voteStatus(view, 'Ben')).toHaveText('Ausstehend');
    await expect(voteStatus(view, 'Cem')).toHaveText('Ausstehend');
    await expect.poll(() => lastRoundNumber(view)).toBe(2);
    const entries = await openHistory(view);
    await expect(entries).toHaveCount(1);
    await expect(entries.getByTestId('history-issue')).toHaveText('#42 Login page');
    await expect(entries.getByTestId('history-round')).toHaveText('Runde 1');
    expect(await texts(entries.getByTestId('history-vote'))).toEqual(['Ben5', 'Cem8']);
    await expect(entries.getByTestId('history-no-final-card')).toHaveText('ohne Endwert');
    await expect(entries.getByTestId('history-final-card')).toHaveCount(0);
  }
  for (const developer of [ben, cem]) {
    await expect(
      developer.page.getByTestId('card-deck').locator('[aria-pressed="true"]'),
    ).toHaveCount(0);
  }

  await playRound(anna, [
    [ben, '5'],
    [cem, '8'],
  ]);

  await anna.page.getByTestId('result-accept').click();
  const dialog = anna.page.getByTestId('confirm-dialog');
  await expect(dialog.getByTestId('confirm-card')).toHaveCount(11);
  await expect(dialog.getByTestId('confirm-submit')).toBeDisabled();
  await dialog.getByRole('radio', { name: '8', exact: true }).check();
  await expect(dialog.getByTestId('confirm-submit')).toBeEnabled();
  await dialog.getByTestId('confirm-submit').click();

  await expect(anna.page.getByTestId('confirm-success')).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expectPhase(everybody, 'Wartet auf ein Issue');
  await expect(anna.page.getByTestId('issue-panel')).toBeVisible();
  for (const view of everybody) {
    const entries = view.page.getByTestId('history-entry');
    await expect(entries).toHaveCount(2);
    await expect(entries.first().getByTestId('history-round')).toHaveText('Runde 2');
    await expect(entries.first().getByTestId('history-final-card')).toHaveText('8');
    await expect(entries.nth(1).getByTestId('history-no-final-card')).toHaveText('ohne Endwert');
  }
  await expect(ben.page.getByTestId('confirm-success')).toHaveCount(0);
});

test('a GitLab error stays in the dialog and the second attempt confirms the result', async ({
  page,
  browser,
}) => {
  const iid = uniqueIssueIid();
  await stubIssueWithFailingFirstNote(iid, 'Export report', stubs);
  const { anna, link } = await createSession(page, String(iid));
  const ben = await join(browser, link, 'Ben');
  await expect(anna.page.getByTestId('participant')).toHaveCount(2);
  await anna.page.getByTestId('issue-release').click();
  await startVoting(anna.page);
  await playRound(anna, [[ben, '3']]);

  await anna.page.getByTestId('result-accept').click();
  const dialog = anna.page.getByTestId('confirm-dialog');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await dialog.getByRole('radio', { name: '5', exact: true }).focus();
  await anna.page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('radio', { name: '8', exact: true })).toBeChecked();
  await expect(dialog.getByTestId('confirm-submit')).toBeEnabled();
  await dialog.getByTestId('confirm-submit').focus();
  await expect(dialog.getByTestId('confirm-submit')).toBeFocused();
  await anna.page.keyboard.press('Enter');

  await expect(dialog.getByTestId('confirm-error')).toHaveText(
    'GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.',
  );
  await expect(dialog.getByTestId('confirm-submit')).toHaveText('Erneut versuchen');
  await expect(dialog.getByRole('radio', { name: '8', exact: true })).toBeChecked();
  await expect(anna.page.getByTestId('error-banner')).toHaveCount(0);
  await expectPhase([anna, ben], 'Runde aufgelöst');

  await dialog.getByTestId('confirm-submit').click();

  await expect(anna.page.getByTestId('confirm-success')).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(anna.page.getByTestId('error-banner')).toHaveCount(0);
  await expectPhase([anna, ben], 'Wartet auf ein Issue');
  for (const view of [anna, ben]) {
    const entries = await openHistory(view);
    await expect(entries).toHaveCount(1);
    await expect(entries.getByTestId('history-issue')).toHaveText(`#${iid} Export report`);
    await expect(entries.getByTestId('history-final-card')).toHaveText('8');
  }
});
