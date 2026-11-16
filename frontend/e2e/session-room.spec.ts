import { Browser, Locator, Page, expect, test } from '@playwright/test';

const PROJECT = '1234';

interface Room {
  scrumMaster: Page;
  developer: Page;
}

async function openRoom(page: Page, browser: Browser, issue = '42'): Promise<Room> {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill(PROJECT);
  await page.getByTestId('create-issue').fill(issue);
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  const link = (await page.getByTestId('share-link').textContent()) ?? '';

  const developer = await (await browser.newContext()).newPage();
  await developer.goto(link);
  await developer.getByTestId('join-name').fill('Ben');
  await developer.getByTestId('join-submit').click();
  await expect(developer.getByTestId('session-role')).toHaveText('Entwickler');
  return { scrumMaster: page, developer };
}

function participant(page: Page, name: string): Locator {
  return page
    .getByTestId('participant')
    .filter({ has: page.getByTestId('participant-name').getByText(name, { exact: true }) });
}

function result(page: Page, iid: number): Locator {
  return page.getByTestId('issue-result').filter({ hasText: `#${iid} ` });
}

test.afterEach(async ({ browser, context: own }) => {
  for (const context of browser.contexts().filter((context) => context !== own)) {
    await context.close();
  }
});

test('both roles see the participants with role and connection state', async ({
  page,
  browser,
}) => {
  const { scrumMaster, developer } = await openRoom(page, browser);

  for (const view of [scrumMaster, developer]) {
    await expect(view.getByTestId('participant')).toHaveCount(2);
    await expect(participant(view, 'Anna').getByTestId('participant-role')).toHaveText(
      'Scrum Master',
    );
    await expect(participant(view, 'Anna').getByTestId('participant-status')).toHaveText(
      'verbunden',
    );
    await expect(participant(view, 'Ben').getByTestId('participant-role')).toHaveCount(0);
    await expect(participant(view, 'Ben').getByTestId('participant-status')).toHaveText(
      'verbunden',
    );
  }

  await developer.context().close();

  await expect(participant(scrumMaster, 'Ben').getByTestId('participant-status')).toHaveText(
    'getrennt',
  );
});

test('the scrum master releases an issue and the developer sees it without reload', async ({
  page,
  browser,
}) => {
  const { scrumMaster, developer } = await openRoom(page, browser);

  await expect(scrumMaster.getByTestId('issue-panel')).toBeVisible();
  await expect(scrumMaster.getByTestId('issue-result')).toHaveCount(2);
  await expect(scrumMaster.getByTestId('issue-load-more')).toHaveCount(0);
  await expect(scrumMaster.getByTestId('issue-search-input')).toBeVisible();
  await expect(scrumMaster.getByTestId('issue-search-submit')).toBeVisible();
  await expect(result(scrumMaster, 42)).toHaveAttribute('aria-pressed', 'true');
  const preview = scrumMaster.getByTestId('issue-preview');
  await expect(preview.getByTestId('issue-preview-iid')).toHaveText('#42');
  await expect(preview.getByTestId('issue-preview-title')).toHaveText('Login page');
  await expect(preview.getByTestId('issue-preview-link')).toHaveAttribute(
    'href',
    'https://gitlab.example/group/project/-/issues/42',
  );

  await expect(developer.getByTestId('lobby-waiting')).toBeVisible();
  await expect(developer.getByTestId('active-issue')).toHaveCount(0);
  await expect(developer.getByTestId('issue-panel')).toHaveCount(0);
  await expect(developer.getByTestId('issue-release')).toHaveCount(0);

  await result(scrumMaster, 43).click();
  await expect(preview.getByTestId('issue-preview-iid')).toHaveText('#43');
  await expect(preview.getByTestId('issue-preview-title')).toHaveText('Password reset');

  await scrumMaster.getByTestId('issue-release').click();

  await expect(scrumMaster.getByTestId('session-phase')).toHaveText('Runde läuft');
  await expect(developer.getByTestId('lobby-waiting')).toHaveCount(0);
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(developer.getByTestId('active-issue-description')).toContainText(
    'reset my password',
  );
  const link = developer.getByTestId('active-issue-link');
  await expect(link).toHaveAttribute('href', 'https://gitlab.example/group/project/-/issues/43');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  await expect(developer.getByTestId('issue-panel')).toHaveCount(0);
  await expect(developer.getByTestId('issue-release')).toHaveCount(0);
});

test('switching the issue while voting asks first and can be cancelled', async ({
  page,
  browser,
}) => {
  const { scrumMaster, developer } = await openRoom(page, browser);
  const release = scrumMaster.getByTestId('issue-release');
  await release.click();
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Login page');

  await expect(release).toHaveText('Issue wechseln');
  await expect(release).toBeDisabled();

  await result(scrumMaster, 43).click();
  await expect(release).toBeEnabled();
  await release.click();
  await expect(scrumMaster.getByTestId('switch-dialog')).toBeVisible();
  await scrumMaster.getByTestId('switch-cancel').click();
  await expect(scrumMaster.getByTestId('switch-dialog')).toHaveCount(0);
  await expect(scrumMaster.getByTestId('active-issue-title')).toHaveText('Login page');
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Login page');

  await release.click();
  await scrumMaster.getByTestId('switch-confirm').click();

  await expect(scrumMaster.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(developer.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(release).toBeDisabled();
});

test('script content of an issue description does not run', async ({ page, browser }) => {
  const { scrumMaster, developer } = await openRoom(page, browser, '44');
  await expect(scrumMaster.getByTestId('issue-preview-iid')).toHaveText('#44');

  await scrumMaster.getByTestId('issue-release').click();

  for (const view of [scrumMaster, developer]) {
    const description = view.getByTestId('active-issue-description');
    await expect(view.getByTestId('active-issue-title')).toHaveText('Script check');
    await expect(description.locator('strong')).toHaveText('fett');
    await expect(description.locator('script')).toHaveCount(0);
    await expect(description.locator('[onerror]')).toHaveCount(0);
    expect(
      await view.evaluate(() => (window as unknown as { __pwned?: unknown }).__pwned),
    ).toBeUndefined();
  }
});
