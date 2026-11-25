import { expect, test } from '@playwright/test';

test('start page shows that the backend is reachable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('health-status')).toHaveText('Backend erreichbar');
});

for (const width of [1280, 375]) {
  test(`at ${width} px the footer with the status ends the start page and the card hand is centred`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const footer = page.getByTestId('start-footer');
    await expect(footer.getByTestId('health-status')).toHaveText('Backend erreichbar');

    const isLast = await footer.evaluate(
      (element) => element.parentElement?.lastElementChild === element,
    );
    expect(isLast).toBe(true);
    const submit = await page.getByTestId('create-submit').boundingBox();
    const footerBox = await footer.boundingBox();
    expect(footerBox!.y).toBeGreaterThan(submit!.y + submit!.height);

    const hand = await page.getByTestId('card-hand').boundingBox();
    const host = await page.getByTestId('start-page').boundingBox();
    const handCentre = hand!.x + hand!.width / 2;
    const hostCentre = host!.x + host!.width / 2;
    expect(Math.abs(handCentre - hostCentre)).toBeLessThanOrEqual(1);
    const title = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(hand!.y + hand!.height).toBeLessThanOrEqual(title!.y);

    for (const locator of [
      page.getByRole('heading', { level: 1 }),
      page.getByTestId('start-lead'),
      page.getByTestId('create-form'),
    ]) {
      const box = await locator.boundingBox();
      expect(Math.abs(box!.x + box!.width / 2 - hostCentre)).toBeLessThanOrEqual(1);
    }
    const status = await footer.getByTestId('health').boundingBox();
    expect(Math.abs(status!.x - footerBox!.x)).toBeLessThanOrEqual(1);
  });
}

test('the footer stands at the bottom of a tall window and follows the form in a short one', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto('/');
  const footer = page.getByTestId('start-footer');
  await expect(footer.getByTestId('health-status')).toHaveText('Backend erreichbar');
  const form = await page.getByTestId('create-form').boundingBox();
  const tall = await footer.boundingBox();
  expect(tall!.y - (form!.y + form!.height)).toBeGreaterThanOrEqual(100);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
    1200,
  );

  await page.setViewportSize({ width: 1280, height: 700 });
  const shortForm = await page.getByTestId('create-form').boundingBox();
  const short = await footer.boundingBox();
  expect(short!.y - (shortForm!.y + shortForm!.height)).toBeLessThan(100);
});
