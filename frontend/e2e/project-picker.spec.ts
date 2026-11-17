import { expect, test } from '@playwright/test';

test('chooses the project by name and the issue by title and opens the session with it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');

  await page.getByTestId('create-project').pressSequentially('Planning');
  const project = page.getByTestId('create-project-option');
  await expect(project).toHaveCount(1);
  await expect(project).toContainText('Planning Poker Test');
  await expect(project).toContainText('group/project · 1234');
  await project.click();
  await expect(page.getByTestId('create-project')).toHaveValue('1234');

  await page.getByTestId('create-issue').pressSequentially('Password');
  const issue = page.getByTestId('create-issue-option').filter({ hasText: 'Password reset' });
  await expect(issue).toHaveText('#43 Password reset');
  await issue.click();
  await expect(page.getByTestId('create-issue')).toHaveValue('43');

  await page.getByTestId('create-submit').click();

  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  await expect(page.getByTestId('issue-preview-iid')).toHaveText('#43');
});

test('shows the empty state of the issue search and keeps a typed issue number', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('create-project').fill('1234');

  await page.getByTestId('create-issue').pressSequentially('kein Treffer');
  await expect(page.getByTestId('create-issue-empty')).toHaveText('Keine Issues gefunden');

  await page.getByTestId('create-issue').fill('42');
  await expect(page.getByTestId('create-issue-option')).toHaveCount(0);
  await expect(page.getByTestId('create-issue')).toHaveValue('42');
});

test('opens the project list on a click into the empty field and then the issue list', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByTestId('create-project').click();
  const project = page.getByTestId('create-project-option');
  await expect(project).toHaveCount(1);
  await expect(project).toContainText('Planning Poker Test');
  await expect(project).toContainText('group/project · 1234');
  await project.click();
  await expect(page.getByTestId('create-project')).toHaveValue('1234');

  await page.getByTestId('create-issue').click();
  const issue = page.getByTestId('create-issue-option').filter({ hasText: 'Password reset' });
  await expect(issue).toHaveText('#43 Password reset');
  await expect(page.getByTestId('create-issue-option').filter({ hasText: '#42' })).toHaveText(
    '#42 Login page',
  );
  await issue.click();
  await expect(page.getByTestId('create-issue')).toHaveValue('43');

  await page.getByTestId('create-project').fill('');
  await page.getByTestId('create-name').click();
  await page.getByTestId('create-project').click();
  await expect(page.getByTestId('create-project-option')).toHaveCount(1);
});

test('creates a session with the project alone and releases an issue in the room', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill('1234');
  await expect(page.getByTestId('create-issue')).toHaveValue('');

  await page.getByTestId('create-submit').click();

  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);
  await expect(page.getByTestId('session-phase')).toHaveText('Wartet auf ein Issue');
  await expect(page.getByTestId('issue-preview-iid')).toHaveCount(0);
  const issue = page.getByTestId('issue-result').filter({ hasText: '#43 ' });
  await expect(issue).toBeVisible();
  await issue.click();
  await expect(page.getByTestId('issue-preview-iid')).toHaveText('#43');

  await page.getByTestId('issue-release').click();

  await expect(page.getByTestId('active-issue-title')).toHaveText('Password reset');
  await expect(page.getByTestId('round-number')).toHaveText('Runde 1');
});
