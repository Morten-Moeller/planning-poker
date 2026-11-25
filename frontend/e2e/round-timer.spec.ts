import { Browser, Page, expect, test } from '@playwright/test';
import { startVoting } from './helpers';

const PROJECT = '1234';
const TIMER_SECONDS = 15;

async function createSession(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill('42');
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

test(
  'the server reveals the round at the deadline without the scrum master',
  { tag: '@react' },
  async ({ browser }) => {
    test.setTimeout(60_000);
    const scrumMaster = await (await browser.newContext()).newPage();
    const link = await createSession(scrumMaster);
    const developer = await join(browser, link, 'Ben');

    await expect(developer.getByTestId('timer-setting')).toHaveCount(0);
    await expect(scrumMaster.getByTestId('timer-setting')).toBeVisible();

    await scrumMaster.getByTestId('timer-setting').click();
    await scrumMaster.getByTestId(`timer-option-${TIMER_SECONDS}`).click();
    await expect(scrumMaster.getByTestId('timer-setting')).toContainText('15 s');

    await expect(scrumMaster.getByTestId('participant')).toHaveCount(2);
    await scrumMaster.getByTestId('issue-release').click();

    await expect(developer.getByTestId('session-phase')).toHaveText('Diskussion');
    await expect(developer.getByTestId('active-issue-title')).toHaveText('Login page');
    await expect(developer.getByTestId('card-deck')).toHaveCount(0);
    await expect(developer.getByRole('timer')).toHaveCount(0);
    await expect(scrumMaster.getByTestId('round-start-timer')).toHaveText('Timer: 15 s');
    await scrumMaster.waitForTimeout(2_000);
    await expect(developer.getByTestId('session-phase')).toHaveText('Diskussion');

    await startVoting(scrumMaster);

    await expect(developer.getByTestId('card-deck')).toBeVisible();
    await developer.getByTestId('card-deck').getByTestId('card-5').click();
    await expect(developer.getByTestId('card-deck').getByTestId('card-5')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const page of [scrumMaster, developer]) {
      await expect(page.getByTestId('session-phase')).toHaveText('Runde läuft');
      await expect(page.getByRole('timer')).toHaveText(/Noch 0:1\d/);
    }

    await scrumMaster.context().close();

    await expect(developer.getByTestId('session-phase')).toHaveText('Runde aufgelöst', {
      timeout: (TIMER_SECONDS + 5) * 1000,
    });
    await expect(developer.getByTestId('round-result')).toBeVisible();
    await expect(developer.getByRole('timer')).toHaveCount(0);
  },
);
