import { expect, test } from '@playwright/test';

test('the scrum master sees only issues without weight and all issues with the filter Alle', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('create-name').fill('Anna');
  await page.getByTestId('create-project').fill('1234');
  await page.getByTestId('create-issue').fill('42');
  await page.getByTestId('create-submit').click();
  await expect(page).toHaveURL(/\/session\/[A-Z2-9]{8}$/);

  const results = page.getByTestId('issue-result');
  await expect(results).toHaveCount(2);
  await expect(page.getByTestId('issue-result-weight')).toHaveText([
    'ohne Gewicht',
    'ohne Gewicht',
  ]);
  await expect(results.filter({ hasText: '#46 ' })).toHaveCount(0);

  await page.getByTestId('issue-filter-weight-all').click();

  await expect(results).toHaveCount(3);
  await expect(results.filter({ hasText: '#46 ' }).getByTestId('issue-result-weight')).toHaveText(
    'Gewicht 3',
  );
});
