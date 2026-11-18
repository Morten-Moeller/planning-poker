import { Page, expect, test } from '@playwright/test';

async function createSession(page: Page): Promise<string> {
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  return page.url().split('/').pop() ?? '';
}

async function expectSavedFilters(page: Page): Promise<void> {
  await expect(page.getByTestId('issue-filter-weight-any')).toHaveClass(
    /mat-button-toggle-checked/,
  );
  await expect(page.getByTestId('issue-filter-period')).toContainText('1 Monat');
}

test('the browser keeps name, project, timer and issue filters for the next session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill('1234');
  const first = await createSession(page);

  await page.getByTestId('timer-setting').click();
  await page.getByTestId('timer-option-30').click();
  await expect(page.getByTestId('timer-setting')).toContainText('30 s');
  await page.getByTestId('issue-filter-weight-any').click();
  await page.getByTestId('issue-filter-period').click();
  await page.getByTestId('issue-filter-period-month').click();
  await expectSavedFilters(page);

  await page.goto('/');
  await expect(page.getByTestId('create-name')).toHaveValue('Anna');
  await expect(page.getByTestId('create-project')).toHaveValue('1234');
  await expect(page.getByTestId('create-project-option')).toHaveCount(0);
  const second = await createSession(page);
  expect(second).not.toBe(first);

  await expect(page.getByTestId('timer-setting')).toContainText('30 s');
  await expectSavedFilters(page);

  const developer = await page.context().newPage();
  await developer.goto(`/session/${first}/join`);
  await expect(developer.getByTestId('join-name')).toHaveValue('Anna');
});
