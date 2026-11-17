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
